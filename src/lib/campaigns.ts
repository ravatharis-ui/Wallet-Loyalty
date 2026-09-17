import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAudience } from "@/lib/audience";
import { sendEmail } from "@/lib/email/send";
import { campaignEmail, personalise } from "@/lib/email/templates";
import { sendPushToCustomer } from "@/lib/push/send";
import { appUrl } from "@/lib/env";
import { canSendEmails, subscriptionAccess } from "@/lib/loyalty";
import type { Business, Campaign, Subscription } from "@/lib/db.types";

export interface DeliveryResult {
  sent: number;
  failed: number;
  skipped: boolean;
  /** Détail par canal, pour dire au commerçant ce qui a réellement manqué. */
  emailSent: number;
  pushSent: number;
  /** Faux quand les clés VAPID manquent : aucun push ne peut partir. */
  pushConfigured: boolean;
  /** Clients de l'audience joignables par email. */
  withEmail: number;
}

/**
 * Envoie une campagne à son audience.
 *
 * Partagé entre l'envoi immédiat et le cron des campagnes programmées : une
 * campagne doit partir de la même façon, qu'on ait cliqué « Envoyer » ou
 * qu'une date soit arrivée.
 */
export async function deliverCampaign(campaignId: string): Promise<DeliveryResult> {
  const admin = createSupabaseAdminClient();

  const { data: campaign } = await admin
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .maybeSingle<Campaign>();

  const empty: DeliveryResult = {
    sent: 0,
    failed: 0,
    skipped: true,
    emailSent: 0,
    pushSent: 0,
    pushConfigured: true,
    withEmail: 0,
  };

  if (!campaign || campaign.status === "sent") return empty;

  const [{ data: business }, { data: subscription }] = await Promise.all([
    admin.from("businesses").select("*").eq("id", campaign.business_id).maybeSingle<Business>(),
    admin
      .from("subscriptions")
      .select("*")
      .eq("business_id", campaign.business_id)
      .maybeSingle<Subscription>(),
  ]);

  if (!business) return empty;

  // Une campagne programmée pendant un abonnement actif peut arriver à échéance
  // après son expiration : on revérifie au moment de l'envoi, pas à l'écriture.
  if (!canSendEmails(subscriptionAccess(subscription ?? null))) return empty;

  const audience = await getAudience(campaign.business_id, campaign.audience_type);
  const wantsEmail = campaign.channel === "email" || campaign.channel === "both";
  const wantsPush = campaign.channel === "push" || campaign.channel === "both";

  const now = new Date().toISOString();
  let sent = 0;
  let failed = 0;
  let emailSent = 0;
  let pushSent = 0;
  let pushConfigured = true;

  for (const customer of audience) {
    let reached = false;

    if (wantsPush) {
      const push = await sendPushToCustomer(customer.id, {
        title: personalise(campaign.subject?.trim() || business.name, customer.first_name),
        body: personalise(campaign.message, customer.first_name).slice(0, 160),
        path: `/card/${customer.card_token}`,
        tag: `campaign-${campaign.id}`,
      });

      if (!push.configured) pushConfigured = false;

      if (push.sent > 0) {
        pushSent += 1;
        reached = true;
        await admin.from("messages").insert({
          business_id: campaign.business_id,
          customer_id: customer.id,
          type: "campaign",
          channel: "push",
          status: "sent",
          subject: campaign.subject,
          content: campaign.message,
          sent_at: now,
        });
      }
    }

    if (wantsEmail && customer.email) {
      const rendered = campaignEmail({
        businessName: business.name,
        firstName: customer.first_name,
        cardUrl: `${appUrl()}/card/${customer.card_token}`,
        message: campaign.message,
        subject: campaign.subject,
        imageUrl: campaign.image_url,
      });

      const result = await sendEmail(customer.email, rendered, {
        fromName: business.name,
        replyTo: business.email,
      });

      await admin.from("messages").insert({
        business_id: campaign.business_id,
        customer_id: customer.id,
        type: "campaign",
        channel: "email",
        status: result.ok ? "sent" : "failed",
        subject: rendered.subject,
        content: rendered.text,
        sent_at: result.ok ? now : null,
      });

      if (result.ok) {
        emailSent += 1;
        reached = true;
      }
    }

    if (reached) sent += 1;
    else failed += 1;
  }

  await admin
    .from("campaigns")
    .update({ status: "sent", sent_at: now, recipients: sent })
    .eq("id", campaign.id);

  return {
    sent,
    failed,
    skipped: false,
    emailSent,
    pushSent,
    pushConfigured,
    withEmail: audience.filter((customer) => customer.email).length,
  };
}

/** Campagnes dont la date est arrivée. Appelé par le cron quotidien. */
export async function runScheduledCampaigns(): Promise<{ campaigns: number; sent: number }> {
  const admin = createSupabaseAdminClient();

  const { data: due } = await admin
    .from("campaigns")
    .select("id")
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString())
    .limit(50)
    .returns<{ id: string }[]>();

  let sent = 0;
  for (const campaign of due ?? []) {
    const result = await deliverCampaign(campaign.id);
    sent += result.sent;
  }

  return { campaigns: due?.length ?? 0, sent };
}

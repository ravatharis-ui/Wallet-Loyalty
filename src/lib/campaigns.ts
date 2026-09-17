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

  if (!campaign || campaign.status === "sent") return { sent: 0, failed: 0, skipped: true };

  const [{ data: business }, { data: subscription }] = await Promise.all([
    admin.from("businesses").select("*").eq("id", campaign.business_id).maybeSingle<Business>(),
    admin
      .from("subscriptions")
      .select("*")
      .eq("business_id", campaign.business_id)
      .maybeSingle<Subscription>(),
  ]);

  if (!business) return { sent: 0, failed: 0, skipped: true };

  // Une campagne programmée pendant un abonnement actif peut arriver à échéance
  // après son expiration : on revérifie au moment de l'envoi, pas à l'écriture.
  if (!canSendEmails(subscriptionAccess(subscription ?? null))) {
    return { sent: 0, failed: 0, skipped: true };
  }

  const audience = await getAudience(campaign.business_id, campaign.audience_type);
  const wantsEmail = campaign.channel === "email" || campaign.channel === "both";
  const wantsPush = campaign.channel === "push" || campaign.channel === "both";

  const now = new Date().toISOString();
  let sent = 0;
  let failed = 0;

  for (const customer of audience) {
    let reached = false;

    if (wantsPush) {
      const push = await sendPushToCustomer(customer.id, {
        title: personalise(campaign.subject?.trim() || business.name, customer.first_name),
        body: personalise(campaign.message, customer.first_name).slice(0, 160),
        path: `/card/${customer.card_token}`,
        tag: `campaign-${campaign.id}`,
      });

      if (push.sent > 0) {
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

      if (result.ok) reached = true;
    }

    if (reached) sent += 1;
    else failed += 1;
  }

  await admin
    .from("campaigns")
    .update({ status: "sent", sent_at: now, recipients: sent })
    .eq("id", campaign.id);

  return { sent, failed, skipped: false };
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

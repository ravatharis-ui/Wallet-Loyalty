import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { appUrl } from "@/lib/env";
import { sendEmail } from "@/lib/email/send";
import { rewardAvailableEmail } from "@/lib/email/templates";
import { canSendEmails, subscriptionAccess } from "@/lib/loyalty";
import type { Business, Customer, Subscription } from "@/lib/db.types";

/**
 * Prévient un client qu'il a assez de points pour échanger une récompense.
 *
 * La non-répétition repose sur `customers.reward_notified_at` : tant qu'il est
 * renseigné, on se tait. La fonction SQL `redeem_reward` le remet à zéro, si
 * bien que le client est de nouveau prévenu au palier suivant — et une seule
 * fois par palier atteint.
 */
export async function notifyRewardAvailable(params: {
  businessId: string;
  customerId: string;
  rewardName: string;
}): Promise<void> {
  const admin = createSupabaseAdminClient();

  const [{ data: customer }, { data: business }, { data: subscription }] = await Promise.all([
    admin.from("customers").select("*").eq("id", params.customerId).maybeSingle<Customer>(),
    admin.from("businesses").select("*").eq("id", params.businessId).maybeSingle<Business>(),
    admin
      .from("subscriptions")
      .select("*")
      .eq("business_id", params.businessId)
      .maybeSingle<Subscription>(),
  ]);

  if (!customer || !business || customer.business_id !== params.businessId) return;
  if (!customer.email) return;
  if (customer.reward_notified_at) return;
  // Autorisé en découverte et sur abonnement en cours, coupé après expiration.
  if (!canSendEmails(subscriptionAccess(subscription ?? null))) return;

  const rendered = rewardAvailableEmail({
    businessName: business.name,
    firstName: customer.first_name,
    cardUrl: `${appUrl()}/card/${customer.card_token}`,
    rewardName: params.rewardName,
  });

  const result = await sendEmail(customer.email, rendered, {
    fromName: business.name,
    replyTo: business.email,
  });

  await admin.from("messages").insert({
    business_id: params.businessId,
    customer_id: customer.id,
    type: "reward_available",
    channel: "email",
    status: result.ok ? "sent" : "failed",
    subject: rendered.subject,
    content: rendered.text,
    sent_at: result.ok ? new Date().toISOString() : null,
  });

  // Un échec (Resend en panne, domaine non vérifié) ne doit pas condamner le
  // client au silence : on ne pose le drapeau que sur un envoi réussi.
  if (result.ok) {
    await admin
      .from("customers")
      .update({ reward_notified_at: new Date().toISOString() })
      .eq("id", customer.id);
  }
}

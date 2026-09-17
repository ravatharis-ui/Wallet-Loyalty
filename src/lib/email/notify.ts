import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { appUrl } from "@/lib/env";
import { sendEmail } from "@/lib/email/send";
import { rewardAvailableEmail } from "@/lib/email/templates";
import { canSendEmails, subscriptionAccess } from "@/lib/loyalty";
import { sendPushToCustomer } from "@/lib/push/send";
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
  if (customer.reward_notified_at) return;
  // Autorisé en découverte et sur abonnement en cours, coupé après expiration.
  if (!canSendEmails(subscriptionAccess(subscription ?? null))) return;

  const now = new Date().toISOString();
  let delivered = false;

  // Le push part en premier : il arrive sur l'écran verrouillé et ne coûte
  // rien. L'email suit quand même — tout le monde n'a pas accepté le push.
  const push = await sendPushToCustomer(customer.id, {
    title: `${business.name} — récompense disponible`,
    body: `${customer.first_name}, vous pouvez échanger : ${params.rewardName}.`,
    path: `/card/${customer.card_token}`,
    tag: `reward-${customer.id}`,
  });

  if (push.sent > 0) {
    delivered = true;
    await admin.from("messages").insert({
      business_id: params.businessId,
      customer_id: customer.id,
      type: "reward_available",
      channel: "push",
      status: "sent",
      subject: null,
      content: `Récompense disponible : ${params.rewardName}`,
      sent_at: now,
    });
  }

  if (customer.email) {
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
      sent_at: result.ok ? now : null,
    });

    if (result.ok) delivered = true;
  }

  // Un échec des deux canaux (Resend en panne, aucun appareil abonné) ne doit
  // pas condamner le client au silence : le drapeau n'est posé qu'en cas de
  // remise effective.
  if (delivered) {
    await admin.from("customers").update({ reward_notified_at: now }).eq("id", customer.id);
  }
}

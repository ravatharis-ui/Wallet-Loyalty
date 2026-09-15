import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { appUrl } from "@/lib/env";
import { sendEmail } from "@/lib/email/send";
import { rewardAvailableEmail } from "@/lib/email/templates";
import { hasActiveSubscription, shouldNotifyReward } from "@/lib/loyalty";
import type { Business, Customer, Message, Subscription } from "@/lib/db.types";

/**
 * Notifie un client qu'une récompense est disponible, puis trace le message.
 * Ne renvoie jamais deux fois la même notification pour la même récompense.
 */
export async function notifyRewardAvailable(params: {
  businessId: string;
  customerId: string;
  rewardName: string;
  earnedAt: string;
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
  // Les envois d'emails font partie de l'offre payante.
  if (!hasActiveSubscription(subscription ?? null)) return;

  // Seuls les envois réussis empêchent un renvoi : un échec (Resend non
  // configuré, domaine non vérifié, panne) doit pouvoir être rattrapé.
  const { data: sentMessages } = await admin
    .from("messages")
    .select("type, created_at")
    .eq("customer_id", customer.id)
    .eq("type", "reward_available")
    .eq("status", "sent")
    .order("created_at", { ascending: false })
    .limit(5)
    .returns<Pick<Message, "type" | "created_at">[]>();

  if (
    !shouldNotifyReward(
      { email: customer.email, sentMessages: sentMessages ?? [] },
      params.earnedAt,
    )
  ) {
    return;
  }

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
}

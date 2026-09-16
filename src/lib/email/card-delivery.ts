import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { appUrl } from "@/lib/env";
import { sendEmail } from "@/lib/email/send";
import { welcomeEmail, cardRecoveryEmail } from "@/lib/email/templates";
import { canSendEmails, subscriptionAccess } from "@/lib/loyalty";
import type { Business, Customer, LoyaltyProgram, MessageType, Subscription } from "@/lib/db.types";

/**
 * Remise du lien de la carte au client.
 *
 * Le `card_token` est le seul moyen pour un client de retrouver ses points :
 * l'envoyer par email dès l'inscription le met à l'abri d'un lien perdu.
 */
async function deliverCard(
  customer: Customer,
  type: Extract<MessageType, "welcome" | "card_recovery">,
): Promise<void> {
  if (!customer.email) return;

  const admin = createSupabaseAdminClient();
  const [{ data: business }, { data: subscription }, { data: program }] = await Promise.all([
    admin.from("businesses").select("*").eq("id", customer.business_id).maybeSingle<Business>(),
    admin
      .from("subscriptions")
      .select("*")
      .eq("business_id", customer.business_id)
      .maybeSingle<Subscription>(),
    admin
      .from("loyalty_programs")
      .select("*")
      .eq("business_id", customer.business_id)
      .eq("active", true)
      .maybeSingle<LoyaltyProgram>(),
  ]);

  if (!business) return;
  if (!canSendEmails(subscriptionAccess(subscription ?? null))) return;

  const ctx = {
    businessName: business.name,
    firstName: customer.first_name,
    cardUrl: `${appUrl()}/card/${customer.card_token}`,
  };

  const rendered =
    type === "welcome"
      ? welcomeEmail({
          ...ctx,
          rewardLine: program
            ? `${program.reward_threshold} visites = ${program.reward_name}`
            : null,
        })
      : cardRecoveryEmail(ctx);

  const result = await sendEmail(customer.email, rendered, {
    fromName: business.name,
    replyTo: business.email,
  });

  await admin.from("messages").insert({
    business_id: customer.business_id,
    customer_id: customer.id,
    type,
    channel: "email",
    status: result.ok ? "sent" : "failed",
    subject: rendered.subject,
    content: rendered.text,
    sent_at: result.ok ? new Date().toISOString() : null,
  });
}

/** Email de bienvenue, envoyé juste après la création de la carte. */
export async function sendWelcomeEmail(customer: Customer): Promise<void> {
  await deliverCard(customer, "welcome");
}

/** Renvoi du lien, à la demande du client depuis « J'ai déjà une carte ». */
export async function sendCardRecoveryEmail(customer: Customer): Promise<void> {
  await deliverCard(customer, "card_recovery");
}

import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { appUrl } from "@/lib/env";
import { sendEmail } from "@/lib/email/send";
import { inactive30Email, inactive60Email } from "@/lib/email/templates";
import {
  INACTIVITY_30_DAYS,
  INACTIVITY_MAX_DAYS,
  hasActiveSubscription,
  shouldSendInactivityReminder,
} from "@/lib/loyalty";
import type { Business, Customer, Message, MessageType, Subscription } from "@/lib/db.types";

export interface ReminderRunSummary {
  scanned: number;
  sent: number;
  skipped: number;
  failed: number;
}

type InactivityType = Extract<MessageType, "inactive_30_days" | "inactive_60_days">;

/**
 * Parcourt les clients inactifs et envoie au plus une relance par client.
 *
 * Anti-doublon : on ne renvoie jamais le même type de relance depuis la
 * dernière visite du client (cf. shouldSendInactivityReminder). Chaque envoi
 * est tracé dans `messages`, ce qui rend la tâche idempotente si elle est
 * relancée le même jour.
 */
export async function runInactivityReminders(now: Date = new Date()): Promise<ReminderRunSummary> {
  const admin = createSupabaseAdminClient();
  const summary: ReminderRunSummary = { scanned: 0, sent: 0, skipped: 0, failed: 0 };

  const oldest = new Date(now.getTime() - INACTIVITY_MAX_DAYS * 86_400_000).toISOString();
  const cutoff = new Date(now.getTime() - INACTIVITY_30_DAYS * 86_400_000).toISOString();

  const { data: customers } = await admin
    .from("customers")
    .select("*")
    .not("email", "is", null)
    .not("last_visit_at", "is", null)
    .lt("last_visit_at", cutoff)
    .gte("last_visit_at", oldest)
    .order("last_visit_at", { ascending: true })
    .limit(500)
    .returns<Customer[]>();

  if (!customers || customers.length === 0) return summary;

  // Commerces concernés : on ne relance que pour un abonnement actif.
  const businessIds = [...new Set(customers.map((customer) => customer.business_id))];
  const [{ data: businesses }, { data: subscriptions }] = await Promise.all([
    admin.from("businesses").select("*").in("id", businessIds).returns<Business[]>(),
    admin
      .from("subscriptions")
      .select("*")
      .in("business_id", businessIds)
      .returns<Subscription[]>(),
  ]);

  const businessById = new Map((businesses ?? []).map((business) => [business.id, business]));
  const subscriptionByBusiness = new Map(
    (subscriptions ?? []).map((subscription) => [subscription.business_id, subscription]),
  );

  for (const customer of customers) {
    summary.scanned += 1;

    const business = businessById.get(customer.business_id);
    const subscription = subscriptionByBusiness.get(customer.business_id) ?? null;

    if (!business || !hasActiveSubscription(subscription, now)) {
      summary.skipped += 1;
      continue;
    }

    const { data: sentMessages } = await admin
      .from("messages")
      .select("type, created_at")
      .eq("customer_id", customer.id)
      .in("type", ["inactive_30_days", "inactive_60_days"])
      .order("created_at", { ascending: false })
      .limit(10)
      .returns<Pick<Message, "type" | "created_at">[]>();

    const candidate = {
      lastVisitAt: customer.last_visit_at,
      email: customer.email,
      sentMessages: sentMessages ?? [],
    };

    // La relance 60 jours prime sur la relance 30 jours.
    const type: InactivityType | null = shouldSendInactivityReminder(
      candidate,
      "inactive_60_days",
      now,
    )
      ? "inactive_60_days"
      : shouldSendInactivityReminder(candidate, "inactive_30_days", now)
        ? "inactive_30_days"
        : null;

    if (!type || !customer.email) {
      summary.skipped += 1;
      continue;
    }

    const ctx = {
      businessName: business.name,
      firstName: customer.first_name,
      cardUrl: `${appUrl()}/card/${customer.card_token}`,
    };
    const rendered = type === "inactive_60_days" ? inactive60Email(ctx) : inactive30Email(ctx);

    const result = await sendEmail(customer.email, rendered);

    await admin.from("messages").insert({
      business_id: customer.business_id,
      customer_id: customer.id,
      type,
      channel: "email",
      status: result.ok ? "sent" : "failed",
      subject: rendered.subject,
      content: rendered.text,
      sent_at: result.ok ? now.toISOString() : null,
    });

    if (result.ok) summary.sent += 1;
    else summary.failed += 1;
  }

  return summary;
}

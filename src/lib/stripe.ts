import "server-only";
import Stripe from "stripe";
import { requireEnv, optionalEnv } from "@/lib/env";
import type { SubscriptionStatus } from "@/lib/db.types";
import type { Plan } from "@/lib/pricing";

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (!client) {
    client = new Stripe(requireEnv("STRIPE_SECRET_KEY"), { typescript: true });
  }
  return client;
}

export function trialDays(): number | undefined {
  const raw = optionalEnv("STRIPE_TRIAL_DAYS");
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : undefined;
}

/** Tarif Stripe correspondant à la formule choisie. */
export function priceIdFor(plan: Plan): string {
  return plan === "yearly" ? requireEnv("STRIPE_PRICE_ID_YEARLY") : requireEnv("STRIPE_PRICE_ID");
}

/** La formule annuelle n'est proposée que si son tarif est configuré. */
export function yearlyPlanAvailable(): boolean {
  return Boolean(optionalEnv("STRIPE_PRICE_ID_YEARLY"));
}

const KNOWN_STATUSES: SubscriptionStatus[] = [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "unpaid",
  "paused",
];

/** Traduit le statut Stripe vers notre énumération (contrainte SQL). */
export function toSubscriptionStatus(status: string | null | undefined): SubscriptionStatus {
  const found = KNOWN_STATUSES.find((value) => value === status);
  return found ?? "none";
}

/**
 * Fin de la période en cours.
 * Selon la version de l'API, `current_period_end` est porté par l'abonnement
 * ou par ses items : on gère les deux.
 */
export function periodEnd(subscription: Stripe.Subscription): string | null {
  const fromItems = subscription.items?.data?.[0]?.current_period_end;
  const fromSubscription = (subscription as unknown as { current_period_end?: number })
    .current_period_end;
  const timestamp = fromItems ?? fromSubscription;
  return typeof timestamp === "number" ? new Date(timestamp * 1000).toISOString() : null;
}

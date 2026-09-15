"use server";

import { redirect } from "next/navigation";
import { requireMerchant } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { stripe, trialDays } from "@/lib/stripe";
import { appUrl, requireEnv } from "@/lib/env";

/**
 * Ouvre une session Stripe Checkout pour l'abonnement 49 €/mois.
 * Le business_id est attaché en metadata : le webhook s'en sert pour rattacher
 * l'abonnement au bon commerce.
 */
export async function startCheckoutAction(): Promise<void> {
  const session = await requireMerchant();
  const admin = createSupabaseAdminClient();

  const { data: existing } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("business_id", session.businessId)
    .maybeSingle<{ stripe_customer_id: string | null }>();

  let customerId = existing?.stripe_customer_id ?? null;

  if (!customerId) {
    const customer = await stripe().customers.create({
      email: session.email,
      name: session.business.name,
      metadata: { business_id: session.businessId },
    });
    customerId = customer.id;

    await admin
      .from("subscriptions")
      .upsert(
        { business_id: session.businessId, stripe_customer_id: customerId },
        { onConflict: "business_id" },
      );
  }

  const trial = trialDays();
  const checkout = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: requireEnv("STRIPE_PRICE_ID"), quantity: 1 }],
    client_reference_id: session.businessId,
    subscription_data: {
      metadata: { business_id: session.businessId },
      ...(trial ? { trial_period_days: trial } : {}),
    },
    metadata: { business_id: session.businessId },
    allow_promotion_codes: true,
    success_url: `${appUrl()}/dashboard/settings?abonnement=ok`,
    cancel_url: `${appUrl()}/dashboard/settings?abonnement=annule`,
  });

  if (!checkout.url) throw new Error("Stripe n'a pas renvoyé d'URL de paiement.");
  redirect(checkout.url);
}

/** Portail client Stripe : facture, moyen de paiement, résiliation. */
export async function openBillingPortalAction(): Promise<void> {
  const session = await requireMerchant();
  const admin = createSupabaseAdminClient();

  const { data } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("business_id", session.businessId)
    .maybeSingle<{ stripe_customer_id: string | null }>();

  if (!data?.stripe_customer_id) {
    redirect("/dashboard/settings?abonnement=inconnu");
  }

  const portal = await stripe().billingPortal.sessions.create({
    customer: data.stripe_customer_id,
    return_url: `${appUrl()}/dashboard/settings`,
  });

  redirect(portal.url);
}

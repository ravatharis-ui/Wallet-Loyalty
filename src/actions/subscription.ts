"use server";

import { redirect } from "next/navigation";
import { requireMerchant } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { stripe, trialDays } from "@/lib/stripe";
import { appUrl, requireEnv } from "@/lib/env";

export interface SubscriptionState {
  error?: string;
}

/**
 * Traduit une erreur Stripe en message actionnable pour le commerçant.
 * Ces pages ne sont visibles que par le propriétaire du commerce.
 */
function explain(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("Variable d'environnement manquante")) {
    return `${message} Ajoutez-la dans les variables d'environnement puis redéployez.`;
  }
  if (message.includes("No such price")) {
    return "Tarif Stripe introuvable. Vérifiez STRIPE_PRICE_ID : il doit commencer par « price_ » (et non « prod_ ») et appartenir au même mode (test ou live) que votre clé secrète.";
  }
  if (message.includes("Invalid API Key") || message.includes("No API key")) {
    return "Clé Stripe invalide. Vérifiez STRIPE_SECRET_KEY, puis redéployez.";
  }
  if (
    message.includes("No configuration provided") ||
    message.includes("default configuration has not been created")
  ) {
    return "Le portail client n'est pas activé. Dans Stripe : Paramètres → Facturation → Portail client → activer, puis réessayez.";
  }
  if (message.includes("similar object exists in live mode") || message.includes("test mode key")) {
    return "Mélange entre le mode test et le mode live : la clé, le tarif et le webhook doivent tous venir du même mode.";
  }
  if (message.includes("activate") || message.includes("cannot currently make live charges")) {
    return "Votre compte Stripe n'est pas encore activé pour encaisser des paiements réels. Basculez en mode test (clé sk_test_ + tarif et webhook créés en mode test), ou complétez l'activation de votre compte dans Stripe.";
  }
  // Message brut de Stripe : il est descriptif, ne contient aucun secret, et
  // n'est visible que par le propriétaire du commerce.
  return `Stripe a refusé la demande : « ${message} »`;
}

/**
 * Ouvre une session Stripe Checkout pour l'abonnement 49 €/mois.
 * Le business_id est attaché en metadata : le webhook s'en sert pour rattacher
 * l'abonnement au bon commerce.
 */
export async function startCheckoutAction(
  _prev: SubscriptionState,
  _formData: FormData,
): Promise<SubscriptionState> {
  const session = await requireMerchant();
  let checkoutUrl: string;

  // redirect() lève une exception interne à Next : il doit rester hors du try.
  try {
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

    if (!checkout.url) {
      return { error: "Stripe n'a pas renvoyé d'URL de paiement. Réessayez." };
    }
    checkoutUrl = checkout.url;
  } catch (error) {
    console.error("Stripe checkout", error);
    return { error: explain(error) };
  }

  redirect(checkoutUrl);
}

/** Portail client Stripe : facture, moyen de paiement, résiliation. */
export async function openBillingPortalAction(
  _prev: SubscriptionState,
  _formData: FormData,
): Promise<SubscriptionState> {
  const session = await requireMerchant();
  let portalUrl: string;

  try {
    const admin = createSupabaseAdminClient();

    const { data } = await admin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("business_id", session.businessId)
      .maybeSingle<{ stripe_customer_id: string | null }>();

    if (!data?.stripe_customer_id) {
      return { error: "Aucun abonnement Stripe n'est encore rattaché à ce commerce." };
    }

    const portal = await stripe().billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: `${appUrl()}/dashboard/settings`,
    });
    portalUrl = portal.url;
  } catch (error) {
    console.error("Stripe portal", error);
    return { error: explain(error) };
  }

  redirect(portalUrl);
}

"use server";

import { redirect } from "next/navigation";
import { requireMerchant } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { stripe, trialDays, priceIdFor } from "@/lib/stripe";
import { appUrl } from "@/lib/env";
import { planSchema } from "@/lib/validation";

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
  if (message.includes("No such customer")) {
    return "La référence client Stripe de ce commerce n'existe plus (bascule du mode test au mode live, ou client supprimé dans Stripe). Réessayez : une nouvelle référence sera créée.";
  }
  if (message.includes("recurring price")) {
    return "Ce tarif Stripe est un paiement unique, pas un abonnement. Dans Stripe, créez un nouveau tarif « Récurrent » (période mensuelle ou annuelle selon la formule), puis remplacez STRIPE_PRICE_ID ou STRIPE_PRICE_ID_YEARLY.";
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

/** Le client Stripe enregistré n'existe pas (ou plus) côté Stripe. */
function isMissingCustomer(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("No such customer");
}

/**
 * Identifiant du client Stripe du commerce, créé à la demande.
 *
 * `forceNew` sert à repartir de zéro quand l'identifiant enregistré n'existe
 * pas côté Stripe : c'est le cas après un passage du mode test au mode live,
 * ou si le client a été supprimé dans le tableau de bord Stripe.
 */
async function ensureStripeCustomer(
  session: Awaited<ReturnType<typeof requireMerchant>>,
  forceNew = false,
): Promise<string> {
  const admin = createSupabaseAdminClient();

  if (!forceNew) {
    const { data } = await admin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("business_id", session.businessId)
      .maybeSingle<{ stripe_customer_id: string | null }>();

    if (data?.stripe_customer_id) return data.stripe_customer_id;
  }

  const customer = await stripe().customers.create({
    email: session.email,
    name: session.business.name,
    metadata: { business_id: session.businessId },
  });

  await admin.from("subscriptions").upsert(
    {
      business_id: session.businessId,
      stripe_customer_id: customer.id,
      // L'abonnement précédent, s'il existait, n'a plus cours.
      stripe_subscription_id: null,
    },
    { onConflict: "business_id" },
  );

  return customer.id;
}

/**
 * Ouvre une session Stripe Checkout pour l'abonnement 49 €/mois.
 * Le business_id est attaché en metadata : le webhook s'en sert pour rattacher
 * l'abonnement au bon commerce.
 */
export async function startCheckoutAction(
  _prev: SubscriptionState,
  formData: FormData,
): Promise<SubscriptionState> {
  const session = await requireMerchant();

  // La formule vient du bouton cliqué, jamais un identifiant de tarif brut.
  const parsedPlan = planSchema.safeParse(formData.get("plan"));
  if (!parsedPlan.success) return { error: "Formule d'abonnement inconnue." };
  const plan = parsedPlan.data;

  let checkoutUrl: string;

  // redirect() lève une exception interne à Next : il doit rester hors du try.
  async function createCheckout(customerId: string) {
    const trial = trialDays();
    return stripe().checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceIdFor(plan), quantity: 1 }],
      client_reference_id: session.businessId,
      subscription_data: {
        metadata: { business_id: session.businessId, plan },
        ...(trial ? { trial_period_days: trial } : {}),
      },
      metadata: { business_id: session.businessId, plan },
      allow_promotion_codes: true,
      success_url: `${appUrl()}/dashboard/settings?abonnement=ok`,
      cancel_url: `${appUrl()}/dashboard/settings?abonnement=annule`,
    });
  }

  try {
    let checkout;
    try {
      checkout = await createCheckout(await ensureStripeCustomer(session));
    } catch (error) {
      if (!isMissingCustomer(error)) throw error;
      // Identifiant obsolète (bascule test → live, client supprimé) : on en
      // recrée un et on réessaie une fois.
      checkout = await createCheckout(await ensureStripeCustomer(session, true));
    }

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

    try {
      const portal = await stripe().billingPortal.sessions.create({
        customer: data.stripe_customer_id,
        return_url: `${appUrl()}/dashboard/settings`,
      });
      portalUrl = portal.url;
    } catch (error) {
      if (!isMissingCustomer(error)) throw error;
      // Identifiant obsolète : on l'efface pour qu'une nouvelle souscription
      // reparte proprement, plutôt que de laisser le commerçant bloqué.
      await admin
        .from("subscriptions")
        .update({ stripe_customer_id: null, stripe_subscription_id: null })
        .eq("business_id", session.businessId);

      return {
        error:
          "Aucun abonnement actif chez Stripe pour ce commerce. Souscrivez à nouveau ci-dessus : la référence obsolète vient d'être effacée.",
      };
    }
  } catch (error) {
    console.error("Stripe portal", error);
    return { error: explain(error) };
  }

  redirect(portalUrl);
}

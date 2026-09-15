import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { stripe, toSubscriptionStatus, periodEnd } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Webhook Stripe — source de vérité du statut d'abonnement.
 * La signature est systématiquement vérifiée : aucun corps non signé n'est traité.
 */
export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(
      payload,
      signature,
      requireEnv("STRIPE_WEBHOOK_SECRET"),
    );
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const businessId = session.metadata?.business_id ?? session.client_reference_id ?? null;
        if (businessId && typeof session.subscription === "string") {
          const subscription = await stripe().subscriptions.retrieve(session.subscription);
          await upsertSubscription(businessId, subscription);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const businessId = await resolveBusinessId(subscription);
        if (businessId) {
          await upsertSubscription(
            businessId,
            subscription,
            event.type === "customer.subscription.deleted" ? "canceled" : undefined,
          );
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId =
          typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        if (customerId) {
          const admin = createSupabaseAdminClient();
          await admin
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_customer_id", customerId);
        }
        break;
      }

      default:
        break;
    }
  } catch (error) {
    console.error("Erreur webhook Stripe", event.type, error);
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/** Retrouve le commerce depuis la metadata, sinon depuis le customer Stripe. */
async function resolveBusinessId(subscription: Stripe.Subscription): Promise<string | null> {
  const fromMetadata = subscription.metadata?.business_id;
  if (fromMetadata) return fromMetadata;

  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
  if (!customerId) return null;

  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("subscriptions")
    .select("business_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle<{ business_id: string }>();

  return data?.business_id ?? null;
}

async function upsertSubscription(
  businessId: string,
  subscription: Stripe.Subscription,
  forcedStatus?: "canceled",
) {
  const admin = createSupabaseAdminClient();
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;

  await admin.from("subscriptions").upsert(
    {
      business_id: businessId,
      stripe_customer_id: customerId ?? null,
      stripe_subscription_id: subscription.id,
      status: forcedStatus ?? toSubscriptionStatus(subscription.status),
      current_period_end: periodEnd(subscription),
    },
    { onConflict: "business_id" },
  );
}

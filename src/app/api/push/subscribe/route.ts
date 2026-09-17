import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { cardTokenSchema } from "@/lib/validation";
import type { Customer } from "@/lib/db.types";

export const dynamic = "force-dynamic";

/**
 * Abonnement aux notifications push depuis la carte du client.
 *
 * Le client n'est pas authentifié : il ne détient que son `card_token`, qui
 * fait office de secret. On ne fait donc jamais confiance au `customer_id`
 * envoyé par le navigateur — il est retrouvé côté serveur à partir du token.
 */
const subscribeSchema = z.object({
  token: cardTokenSchema,
  endpoint: z.string().url().max(2000),
  p256dh: z.string().min(1).max(500),
  auth: z.string().min(1).max(500),
});

async function findCustomer(token: string): Promise<Customer | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("customers")
    .select("*")
    .eq("card_token", token)
    .maybeSingle<Customer>();
  return data ?? null;
}

export async function POST(request: NextRequest) {
  const parsed = subscribeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const customer = await findCustomer(parsed.data.token);
  if (!customer) {
    return NextResponse.json({ error: "Carte introuvable." }, { status: 404 });
  }

  const admin = createSupabaseAdminClient();
  // Le même appareil qui se réabonne doit remplacer son enregistrement, pas
  // en créer un second : l'endpoint est unique.
  const { error } = await admin.from("push_subscriptions").upsert(
    {
      business_id: customer.business_id,
      customer_id: customer.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.p256dh,
      auth: parsed.data.auth,
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    return NextResponse.json({ error: "Abonnement impossible." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const parsed = subscribeSchema
    .pick({ token: true, endpoint: true })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const customer = await findCustomer(parsed.data.token);
  if (!customer) {
    return NextResponse.json({ error: "Carte introuvable." }, { status: 404 });
  }

  const admin = createSupabaseAdminClient();
  // Le filtre sur customer_id empêche de désabonner l'appareil d'autrui même
  // en devinant un endpoint.
  await admin
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", parsed.data.endpoint)
    .eq("customer_id", customer.id);

  return NextResponse.json({ ok: true });
}

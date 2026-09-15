/**
 * Tests d'intégration exécutés contre une vraie base Supabase.
 *
 * Ils vérifient ce qui ne peut pas l'être en mémoire : l'isolation RLS entre
 * commerces et le comportement atomique de la fonction SQL `add_visit`.
 *
 * Lancer avec un projet de test (jamais la production) :
 *   NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
 *   SUPABASE_SERVICE_ROLE_KEY=... pnpm test
 *
 * Sans ces variables, la suite est ignorée.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const configured = Boolean(url && anonKey && serviceKey);

const run = configured ? describe : describe.skip;

interface Tenant {
  businessId: string;
  userId: string;
  email: string;
  password: string;
  customerId: string;
  client: SupabaseClient;
}

run("isolation entre commerces (RLS)", () => {
  let admin: SupabaseClient;
  let alpha: Tenant;
  let beta: Tenant;

  async function createTenant(label: string): Promise<Tenant> {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const email = `test-${label}-${suffix}@example.com`;
    const password = `Password!${suffix}`;

    const { data: business } = await admin
      .from("businesses")
      .insert({ name: `Test ${label} ${suffix}`, slug: `test-${label}-${suffix}`.slice(0, 50) })
      .select("id")
      .single();

    const { data: userData, error: userError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (userError) throw userError;

    await admin
      .from("profiles")
      .insert({ id: userData.user.id, business_id: business!.id, role: "merchant" });

    await admin.from("loyalty_programs").insert({
      business_id: business!.id,
      name: "Test",
      points_per_visit: 1,
      reward_threshold: 3,
      reward_name: "Récompense test",
      active: true,
    });

    await admin.from("subscriptions").insert({ business_id: business!.id, status: "active" });

    const { data: customer } = await admin
      .from("customers")
      .insert({
        business_id: business!.id,
        first_name: `Client${label}`,
        phone: `06${Math.floor(10_000_000 + Math.random() * 89_999_999)}`,
      })
      .select("id")
      .single();

    const client = createClient(url!, anonKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: signInError } = await client.auth.signInWithPassword({ email, password });
    if (signInError) throw signInError;

    return {
      businessId: business!.id,
      userId: userData.user.id,
      email,
      password,
      customerId: customer!.id,
      client,
    };
  }

  beforeAll(async () => {
    admin = createClient(url!, serviceKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    alpha = await createTenant("alpha");
    beta = await createTenant("beta");
  }, 60_000);

  afterAll(async () => {
    if (!admin) return;
    for (const tenant of [alpha, beta]) {
      if (!tenant) continue;
      await admin.auth.admin.deleteUser(tenant.userId);
      await admin.from("businesses").delete().eq("id", tenant.businessId);
    }
  }, 60_000);

  it("le commerce A ne voit que ses propres clients", async () => {
    const { data } = await alpha.client.from("customers").select("id, business_id");
    expect(data?.length).toBe(1);
    expect(data?.[0].business_id).toBe(alpha.businessId);
  });

  it("le commerce A ne peut pas lire un client du commerce B par son id", async () => {
    const { data } = await alpha.client
      .from("customers")
      .select("id")
      .eq("id", beta.customerId)
      .maybeSingle();
    expect(data).toBeNull();
  });

  it("le commerce A ne peut pas modifier un client du commerce B", async () => {
    await alpha.client.from("customers").update({ first_name: "Pirate" }).eq("id", beta.customerId);

    const { data } = await admin
      .from("customers")
      .select("first_name")
      .eq("id", beta.customerId)
      .single();
    expect(data?.first_name).not.toBe("Pirate");
  });

  it("le commerce A ne peut pas ajouter une visite à un client du commerce B", async () => {
    const { error } = await alpha.client.rpc("add_visit", {
      p_customer_id: beta.customerId,
      p_business_id: beta.businessId,
    });
    expect(error).not.toBeNull();

    const { data } = await admin
      .from("customers")
      .select("total_visits")
      .eq("id", beta.customerId)
      .single();
    expect(data?.total_visits).toBe(0);
  });

  it("le commerce A ne voit pas les récompenses ni les campagnes du commerce B", async () => {
    await admin.from("campaigns").insert({
      business_id: beta.businessId,
      name: "Campagne B",
      message: "Secret",
      audience_type: "all",
    });

    const { data } = await alpha.client.from("campaigns").select("id");
    expect(data?.length ?? 0).toBe(0);
  });

  it("le commerce A ne voit pas l'abonnement du commerce B", async () => {
    const { data } = await alpha.client.from("subscriptions").select("business_id");
    expect(data?.every((row) => row.business_id === alpha.businessId)).toBe(true);
  });
});

run("add_visit (RPC atomique)", () => {
  let admin: SupabaseClient;
  let businessId: string;
  let customerId: string;

  beforeAll(async () => {
    admin = createClient(url!, serviceKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const { data: business } = await admin
      .from("businesses")
      .insert({ name: `Visite ${suffix}`, slug: `visite-${suffix}`.slice(0, 50) })
      .select("id")
      .single();
    businessId = business!.id;

    await admin.from("loyalty_programs").insert({
      business_id: businessId,
      name: "Test",
      points_per_visit: 1,
      reward_threshold: 3,
      reward_name: "3e café offert",
      active: true,
    });

    const { data: customer } = await admin
      .from("customers")
      .insert({
        business_id: businessId,
        first_name: "Thomas",
        phone: `06${Math.floor(10_000_000 + Math.random() * 89_999_999)}`,
      })
      .select("id")
      .single();
    customerId = customer!.id;
  }, 60_000);

  afterAll(async () => {
    if (admin && businessId) await admin.from("businesses").delete().eq("id", businessId);
  });

  it("incrémente les points et crée la récompense au seuil", async () => {
    // Fenêtre anti-doublon neutralisée pour enchaîner les visites dans le test.
    for (let i = 0; i < 2; i++) {
      await admin.rpc("add_visit", {
        p_customer_id: customerId,
        p_business_id: businessId,
        p_dedupe_seconds: 0,
      });
    }

    const { data: third } = await admin.rpc("add_visit", {
      p_customer_id: customerId,
      p_business_id: businessId,
      p_dedupe_seconds: 0,
    });

    expect(third.rewards_created).toBe(1);
    expect(third.total_visits).toBe(3);
    expect(third.current_points).toBe(0);

    const { count } = await admin
      .from("rewards")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customerId)
      .eq("status", "available");
    expect(count).toBe(1);
  }, 30_000);

  it("ignore un double clic dans la fenêtre anti-doublon", async () => {
    const before = await admin
      .from("customers")
      .select("total_visits")
      .eq("id", customerId)
      .single();

    const { data: first } = await admin.rpc("add_visit", {
      p_customer_id: customerId,
      p_business_id: businessId,
      p_dedupe_seconds: 10,
    });
    const { data: second } = await admin.rpc("add_visit", {
      p_customer_id: customerId,
      p_business_id: businessId,
      p_dedupe_seconds: 10,
    });

    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);

    const after = await admin
      .from("customers")
      .select("total_visits")
      .eq("id", customerId)
      .single();
    expect(after.data!.total_visits).toBe(before.data!.total_visits + 1);
  }, 30_000);
});

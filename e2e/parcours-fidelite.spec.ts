/**
 * Parcours critique de bout en bout :
 *   commerçant s'inscrit → crée son programme → affiche son QR d'inscription
 *   → le client rejoint → reçoit sa carte → le commerçant valide des visites
 *   → la récompense apparaît à la 10e visite.
 *
 * Nécessite un projet Supabase de test (jamais la production) avec la
 * confirmation d'email désactivée :
 *   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Sans ces variables, le test est ignoré.
 */
import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const configured = Boolean(url && serviceKey && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const merchantEmail = `e2e-merchant-${suffix}@example.com`;
const merchantPassword = `Password!${suffix}`;
const businessName = `E2E Café ${suffix}`;
const customerPhone = `06${suffix.slice(-8)}`;

let admin: SupabaseClient | null = null;
let businessId: string | null = null;

test.skip(!configured, "Variables Supabase absentes : parcours E2E ignoré.");
test.describe.configure({ mode: "serial" });

test.afterAll(async () => {
  if (!admin || !businessId) return;
  const { data: profiles } = await admin
    .from("profiles")
    .select("id")
    .eq("business_id", businessId);
  await admin.from("businesses").delete().eq("id", businessId);
  for (const profile of profiles ?? []) {
    await admin.auth.admin.deleteUser(profile.id);
  }
});

test("parcours complet commerçant + client", async ({ page }) => {
  test.setTimeout(180_000);
  admin = createClient(url!, serviceKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // --- 1. Le commerçant crée son compte -----------------------------------
  await page.goto("/signup");
  await page.getByLabel("Nom de votre commerce").fill(businessName);
  await page.getByLabel("Email").fill(merchantEmail);
  await page.getByLabel("Mot de passe").fill(merchantPassword);
  await page.getByRole("button", { name: "Créer mon compte" }).click();

  await page.waitForURL("**/dashboard", { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: /Bonjour/ })).toBeVisible();

  const { data: business } = await admin
    .from("businesses")
    .select("id, slug")
    .eq("name", businessName)
    .single();
  businessId = business!.id;
  // Abonnement simulé : Stripe n'est pas sollicité en E2E, et cela lève au
  // passage la limite de 3 cartes du mode découverte.
  await admin
    .from("subscriptions")
    .upsert({ business_id: businessId, status: "trialing" }, { onConflict: "business_id" });

  // --- 2. Il configure son programme de fidélité ---------------------------
  await page.goto("/dashboard/loyalty");
  await page.getByLabel("Points par visite").fill("1");
  await page.getByLabel("Points pour une récompense").fill("10");
  await page.getByLabel("Récompense", { exact: true }).fill("1 café offert");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Programme enregistré.")).toBeVisible();

  // --- 3. Il affiche son QR code d'inscription ----------------------------
  await page.goto("/dashboard/settings");
  await expect(page.getByAltText("QR code d'inscription à votre programme")).toBeVisible();
  await expect(page.getByText(`/join/${business!.slug}`)).toBeVisible();

  // --- 4. Le client rejoint le programme ----------------------------------
  const clientContext = await page.context().browser()!.newContext();
  const clientPage = await clientContext.newPage();
  await clientPage.goto(`/join/${business!.slug}`);
  await expect(clientPage.getByText("10 visites = 1 café offert")).toBeVisible();

  await clientPage.getByLabel("Prénom *").fill("Thomas");
  await clientPage.getByLabel("Téléphone *").fill(customerPhone);
  await clientPage.getByLabel("Email *").fill(`e2e-client-${suffix}@example.com`);
  await clientPage.getByRole("checkbox").check();
  await clientPage.getByRole("button", { name: "Créer ma carte" }).click();

  // --- 5. Il obtient sa carte digitale avec son QR personnel --------------
  await clientPage.waitForURL("**/card/**", { timeout: 30_000 });
  await expect(clientPage.getByText("Thomas")).toBeVisible();
  await expect(clientPage.getByText("0 / 10 visites")).toBeVisible();
  await expect(clientPage.getByAltText("QR code de votre carte de fidélité")).toBeVisible();

  // --- 6. Le commerçant enregistre une visite -----------------------------
  await page.goto("/dashboard/scan");
  await page.getByLabel("Rechercher un client").fill(customerPhone);
  await page.getByRole("button", { name: "Chercher" }).click();
  await expect(page.getByText("Thomas")).toBeVisible();
  await page.getByRole("button", { name: "+1 visite" }).click();
  await expect(page.getByText("+1 ⭐")).toBeVisible();
  await expect(page.getByText("1 / 10 points")).toBeVisible();

  // --- 7. Visites 2 à 9 (raccourci serveur : la fenêtre anti-doublon
  //        interdit 10 clics d'affilée, ce que le test 6 a déjà vérifié) ----
  const { data: customer } = await admin
    .from("customers")
    .select("id")
    .eq("business_id", businessId)
    .eq("phone", customerPhone)
    .single();

  for (let i = 0; i < 8; i++) {
    await admin.rpc("add_visit", {
      p_customer_id: customer!.id,
      p_business_id: businessId,
      p_dedupe_seconds: 0,
    });
  }
  // On antidate les visites pour sortir de la fenêtre anti-doublon.
  await admin
    .from("visits")
    .update({ created_at: new Date(Date.now() - 120_000).toISOString() })
    .eq("customer_id", customer!.id);

  // --- 8. La 10e visite, via l'interface, déclenche la récompense ---------
  await page.goto("/dashboard/scan");
  await page.getByLabel("Rechercher un client").fill(customerPhone);
  await page.getByRole("button", { name: "Chercher" }).click();
  await expect(page.getByText("9 / 10 points")).toBeVisible();
  await page.getByRole("button", { name: "+1 visite" }).click();
  await expect(page.getByText("🎉 Nouvelle récompense disponible")).toBeVisible();

  // --- 9. Le client voit sa récompense sur sa carte -----------------------
  await clientPage.reload();
  await expect(clientPage.getByText("Récompense disponible")).toBeVisible();

  // --- 10. Le commerçant utilise la récompense ----------------------------
  await page.goto("/dashboard/rewards");
  await page.getByRole("button", { name: "Utiliser la récompense" }).first().click();
  await page.getByRole("button", { name: "Oui" }).click();
  await expect(page.getByText("Utilisée").first()).toBeVisible();

  await clientContext.close();
});

/**
 * Vérification d'un projet Supabase fraîchement migré.
 *
 *   NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
 *   SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/check-supabase.ts
 *
 * Contrôle : présence des tables, de la fonction add_visit, et surtout que
 * l'accès anonyme est bien refusé par les RLS.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error("Variables manquantes. Voir .env.example.");
  process.exit(1);
}

const TABLES = [
  "businesses",
  "profiles",
  "loyalty_programs",
  "customers",
  "visits",
  "rewards",
  "messages",
  "campaigns",
  "subscriptions",
];

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anon = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let failures = 0;

function report(ok: boolean, label: string, detail = "") {
  if (!ok) failures += 1;
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  console.log("\n— Tables —");
  for (const table of TABLES) {
    const { error } = await admin.from(table).select("*", { count: "exact", head: true });
    report(!error, `table ${table}`, error?.message ?? "");
  }

  console.log("\n— Fonction add_visit —");
  {
    const { error } = await admin.rpc("add_visit", {
      p_customer_id: "00000000-0000-0000-0000-000000000000",
      p_business_id: "00000000-0000-0000-0000-000000000000",
    });
    // On attend customer_not_found : la fonction existe et s'exécute.
    const exists = Boolean(error?.message.includes("customer_not_found"));
    report(exists, "add_visit exécutable", exists ? "" : (error?.message ?? "réponse inattendue"));
  }

  console.log("\n— RLS : aucun accès anonyme —");
  for (const table of ["customers", "visits", "rewards", "businesses", "subscriptions"]) {
    const { data, error } = await anon.from(table).select("*").limit(1);
    const blocked = error !== null || (data?.length ?? 0) === 0;
    report(blocked, `lecture anonyme de ${table} refusée`, blocked ? "" : "DONNÉES EXPOSÉES");
  }

  console.log("\n— Auth —");
  {
    const { data, error } = await admin.auth.admin.listUsers();
    report(
      !error,
      "clé service_role valide",
      error?.message ?? `${data?.users.length ?? 0} utilisateur(s)`,
    );
  }

  console.log(
    failures === 0 ? "\nTout est en place. ✅\n" : `\n${failures} problème(s) détecté(s). ❌\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("Échec de la vérification :", error);
  process.exit(1);
});

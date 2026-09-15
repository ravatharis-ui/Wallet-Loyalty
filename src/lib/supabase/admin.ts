import "server-only";
import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "@/lib/env";

/**
 * Client "service role" : contourne RLS.
 *
 * Réservé aux opérations serveur qui ne peuvent pas passer par une session
 * commerçant (inscription publique d'un client, lecture d'une carte via son
 * token, webhook Stripe, cron). Chaque appel DOIT filtrer explicitement sur
 * le business_id, le slug ou le card_token concerné.
 */
export function createSupabaseAdminClient() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

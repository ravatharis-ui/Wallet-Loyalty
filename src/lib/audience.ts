import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { inactivityCutoff } from "@/lib/stats";
import type { AudienceType, Customer } from "@/lib/db.types";

/**
 * Destinataires d'une campagne pour un commerce.
 * Toujours filtré sur le business_id du commerçant connecté (jamais du navigateur).
 * Seuls les clients avec un email sont retenus.
 */
export async function getAudience(
  businessId: string,
  audienceType: AudienceType,
): Promise<Customer[]> {
  const admin = createSupabaseAdminClient();

  if (audienceType === "reward_available") {
    const { data } = await admin
      .from("customers")
      .select("*, rewards!inner(id)")
      .eq("business_id", businessId)
      .eq("rewards.status", "available")
      .not("email", "is", null)
      .limit(2000)
      .returns<Customer[]>();

    // La jointure peut dupliquer un client ayant plusieurs récompenses.
    const unique = new Map((data ?? []).map((customer) => [customer.id, customer]));
    return [...unique.values()];
  }

  const base = admin
    .from("customers")
    .select("*")
    .eq("business_id", businessId)
    .not("email", "is", null)
    .limit(2000);

  const { data } =
    audienceType === "inactive_30_days"
      ? await base
          .not("last_visit_at", "is", null)
          .lt("last_visit_at", inactivityCutoff())
          .returns<Customer[]>()
      : await base.returns<Customer[]>();

  return data ?? [];
}

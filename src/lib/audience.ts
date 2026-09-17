import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { inactivityCutoff } from "@/lib/stats";
import type { AudienceType, Customer, RewardTier } from "@/lib/db.types";

/** Au-delà, une campagne relève de l'emailing de masse, pas du commerce de proximité. */
const MAX_RECIPIENTS = 2000;

/** Nombre de visites à partir duquel un client est considéré comme un habitué. */
export const REGULAR_CUSTOMER_VISITS = 5;

/** Premier jour du mois en cours, en ISO. */
function startOfMonth(now: Date = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

/**
 * Destinataires d'une campagne pour un commerce.
 *
 * Toujours filtré sur le business_id du commerçant connecté, jamais sur une
 * valeur venue du navigateur. La liste n'exclut pas les clients sans email :
 * c'est l'expéditeur qui décide, selon le canal choisi, qui il peut joindre.
 */
export async function getAudience(
  businessId: string,
  audienceType: AudienceType,
): Promise<Customer[]> {
  const admin = createSupabaseAdminClient();

  if (audienceType === "reward_available") {
    // « A de quoi échanger » se mesure sur le premier palier du catalogue :
    // en dessous, le client n'a encore rien à venir chercher.
    const { data: tiers } = await admin
      .from("reward_tiers")
      .select("points_cost")
      .eq("business_id", businessId)
      .eq("active", true)
      .order("points_cost", { ascending: true })
      .limit(1)
      .returns<Pick<RewardTier, "points_cost">[]>();

    const cheapest = tiers?.[0]?.points_cost;
    if (cheapest === undefined) return [];

    const { data } = await admin
      .from("customers")
      .select("*")
      .eq("business_id", businessId)
      .gte("current_points", cheapest)
      .limit(MAX_RECIPIENTS)
      .returns<Customer[]>();
    return data ?? [];
  }

  if (audienceType === "inactive_30_days") {
    const { data } = await admin
      .from("customers")
      .select("*")
      .eq("business_id", businessId)
      .not("last_visit_at", "is", null)
      .lt("last_visit_at", inactivityCutoff())
      .limit(MAX_RECIPIENTS)
      .returns<Customer[]>();
    return data ?? [];
  }

  if (audienceType === "new_this_month") {
    const { data } = await admin
      .from("customers")
      .select("*")
      .eq("business_id", businessId)
      .gte("created_at", startOfMonth())
      .limit(MAX_RECIPIENTS)
      .returns<Customer[]>();
    return data ?? [];
  }

  if (audienceType === "best_customers") {
    const { data } = await admin
      .from("customers")
      .select("*")
      .eq("business_id", businessId)
      .gte("total_visits", REGULAR_CUSTOMER_VISITS)
      .order("total_visits", { ascending: false })
      .limit(MAX_RECIPIENTS)
      .returns<Customer[]>();
    return data ?? [];
  }

  const { data } = await admin
    .from("customers")
    .select("*")
    .eq("business_id", businessId)
    .limit(MAX_RECIPIENTS)
    .returns<Customer[]>();
  return data ?? [];
}

"use server";

import { revalidatePath } from "next/cache";
import { requireMerchant } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loyaltyProgramSchema, rewardTierSchema, uuidSchema, firstError } from "@/lib/validation";
import type { LoyaltyProgram, RewardTier } from "@/lib/db.types";

export interface ActionState {
  error?: string;
  success?: string;
}

/** Programme actif du commerce connecté (null si aucun). */
export async function getActiveProgram(businessId: string): Promise<LoyaltyProgram | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("loyalty_programs")
    .select("*")
    .eq("business_id", businessId)
    .eq("active", true)
    .maybeSingle<LoyaltyProgram>();
  return data ?? null;
}

export async function saveLoyaltyProgramAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireMerchant();

  const parsed = loyaltyProgramSchema.safeParse({
    name: formData.get("name"),
    mode: formData.get("mode") ?? "stamp",
    pointsPerVisit: formData.get("pointsPerVisit") ?? 1,
    pointsPerEuro: formData.get("pointsPerEuro") ?? 1,
    referralPoints: formData.get("referralPoints") ?? 0,
    referralMinAmount: formData.get("referralMinAmount") ?? "",
    referralMonthlyLimit: formData.get("referralMonthlyLimit") ?? 0,
    active: formData.get("active") === "on",
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createSupabaseServerClient();
  const values = {
    name: parsed.data.name,
    mode: parsed.data.mode,
    points_per_visit: parsed.data.pointsPerVisit,
    points_per_euro: parsed.data.pointsPerEuro,
    referral_points: parsed.data.referralPoints,
    referral_min_amount_cents: parsed.data.referralMinAmount,
    referral_monthly_limit: parsed.data.referralMonthlyLimit,
    active: parsed.data.active,
  };

  // RLS garantit qu'on ne peut écrire que sur son propre commerce.
  const { data: existing } = await supabase
    .from("loyalty_programs")
    .select("id")
    .eq("business_id", session.businessId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ id: string }>();

  const { error } = existing
    ? await supabase.from("loyalty_programs").update(values).eq("id", existing.id)
    : await supabase
        .from("loyalty_programs")
        .insert({ ...values, business_id: session.businessId });

  if (error) return { error: "Enregistrement impossible. Réessayez." };

  revalidatePath("/dashboard/loyalty");
  revalidatePath("/dashboard");
  return { success: "Programme enregistré." };
}

/** Catalogue des récompenses d'un commerce, du moins cher au plus cher. */
export async function getRewardTiers(businessId: string): Promise<RewardTier[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("reward_tiers")
    .select("*")
    .eq("business_id", businessId)
    .eq("active", true)
    .order("points_cost", { ascending: true })
    .returns<RewardTier[]>();
  return data ?? [];
}

/** Ajoute un palier, ou met à jour celui dont l'identifiant est fourni. */
export async function saveRewardTierAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireMerchant();

  const parsed = rewardTierSchema.safeParse({
    name: formData.get("name"),
    pointsCost: formData.get("pointsCost"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const rawId = formData.get("tierId");
  const tierId = typeof rawId === "string" && rawId.length > 0 ? uuidSchema.safeParse(rawId) : null;
  if (tierId && !tierId.success) return { error: "Palier introuvable." };

  const supabase = await createSupabaseServerClient();
  const values = { name: parsed.data.name, points_cost: parsed.data.pointsCost };

  // RLS restreint déjà l'écriture au commerce connecté ; le filtre explicite
  // sur business_id évite de dépendre uniquement d'elle.
  const { error } = tierId
    ? await supabase
        .from("reward_tiers")
        .update(values)
        .eq("id", tierId.data)
        .eq("business_id", session.businessId)
    : await supabase.from("reward_tiers").insert({ ...values, business_id: session.businessId });

  if (error) return { error: "Enregistrement impossible. Réessayez." };

  revalidatePath("/dashboard/loyalty");
  revalidatePath("/dashboard");
  return { success: tierId ? "Palier modifié." : "Palier ajouté." };
}

/**
 * Retire un palier du catalogue.
 *
 * On le désactive au lieu de le supprimer : les récompenses déjà échangées y
 * font référence, et l'historique du commerçant doit rester lisible.
 */
export async function deleteRewardTierAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireMerchant();

  const parsed = uuidSchema.safeParse(formData.get("tierId"));
  if (!parsed.success) return { error: "Palier introuvable." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("reward_tiers")
    .update({ active: false })
    .eq("id", parsed.data)
    .eq("business_id", session.businessId);

  if (error) return { error: "Suppression impossible. Réessayez." };

  revalidatePath("/dashboard/loyalty");
  revalidatePath("/dashboard");
  return { success: "Palier retiré." };
}

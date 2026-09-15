"use server";

import { revalidatePath } from "next/cache";
import { requireMerchant } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loyaltyProgramSchema, firstError } from "@/lib/validation";
import type { LoyaltyProgram } from "@/lib/db.types";

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
    pointsPerVisit: formData.get("pointsPerVisit"),
    rewardThreshold: formData.get("rewardThreshold"),
    rewardName: formData.get("rewardName"),
    rewardDescription: formData.get("rewardDescription") ?? "",
    active: formData.get("active") === "on",
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createSupabaseServerClient();
  const values = {
    name: parsed.data.name,
    points_per_visit: parsed.data.pointsPerVisit,
    reward_threshold: parsed.data.rewardThreshold,
    reward_name: parsed.data.rewardName,
    reward_description: parsed.data.rewardDescription,
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

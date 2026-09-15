"use server";

import { revalidatePath } from "next/cache";
import { requireMerchant } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/validation";
import type { Reward } from "@/lib/db.types";

export interface RedeemState {
  error?: string;
  success?: string;
}

/**
 * Marque une récompense comme utilisée.
 * L'UPDATE est conditionné à `status = 'available'` : une récompense déjà
 * utilisée ne peut pas l'être une seconde fois, même en cas de double clic.
 */
export async function redeemRewardAction(
  _prev: RedeemState,
  formData: FormData,
): Promise<RedeemState> {
  const session = await requireMerchant();

  const parsed = uuidSchema.safeParse(formData.get("rewardId"));
  if (!parsed.success) return { error: "Récompense invalide." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("rewards")
    .update({ status: "redeemed", redeemed_at: new Date().toISOString() })
    .eq("id", parsed.data)
    .eq("business_id", session.businessId)
    .eq("status", "available")
    .select("id")
    .maybeSingle<Pick<Reward, "id">>();

  if (error) return { error: "Opération impossible. Réessayez." };
  if (!data) return { error: "Cette récompense a déjà été utilisée." };

  revalidatePath("/dashboard/rewards");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/customers");
  return { success: "Récompense utilisée." };
}

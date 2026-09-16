"use server";

import { headers } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { phoneSchema } from "@/lib/validation";
import { rateLimit, pruneRateLimits } from "@/lib/rate-limit";
import { sendCardRecoveryEmail } from "@/lib/email/card-delivery";
import type { Business, Customer } from "@/lib/db.types";

export interface RecoverState {
  error?: string;
  success?: string;
}

/**
 * Renvoie le lien de la carte par email.
 *
 * La réponse est volontairement identique qu'un client existe ou non : afficher
 * le résultat permettrait de savoir qui fréquente le commerce à partir d'un
 * simple numéro de téléphone. Le lien part par email, jamais à l'écran.
 */
export async function recoverCardAction(
  _prev: RecoverState,
  formData: FormData,
): Promise<RecoverState> {
  const slug = String(formData.get("businessSlug") ?? "");
  if (!/^[a-z0-9-]{1,50}$/.test(slug)) return { error: "Commerce introuvable." };

  const parsedPhone = phoneSchema.safeParse(formData.get("phone"));
  if (!parsedPhone.success) return { error: "Numéro de téléphone invalide." };

  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    "unknown";

  pruneRateLimits();
  if (!rateLimit(`recover:${ip}`, 5, 60 * 60 * 1000)) {
    return { error: "Trop de demandes. Réessayez dans une heure." };
  }

  const admin = createSupabaseAdminClient();
  const { data: business } = await admin
    .from("businesses")
    .select("id")
    .eq("slug", slug)
    .maybeSingle<Pick<Business, "id">>();

  const neutral = {
    success:
      "Si une carte existe pour ce numéro, le lien vient d'être envoyé à l'adresse email associée. Pensez à vérifier vos spams.",
  };

  if (!business) return neutral;

  const { data: customer } = await admin
    .from("customers")
    .select("*")
    .eq("business_id", business.id)
    .eq("phone", parsedPhone.data)
    .maybeSingle<Customer>();

  if (customer) {
    try {
      await sendCardRecoveryEmail(customer);
    } catch {
      // tracé dans la table messages si l'insertion a eu lieu
    }
  }

  return neutral;
}

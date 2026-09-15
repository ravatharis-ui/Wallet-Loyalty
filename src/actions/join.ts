"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { joinSchema, firstError } from "@/lib/validation";
import { rateLimit, pruneRateLimits } from "@/lib/rate-limit";
import type { Business, Customer } from "@/lib/db.types";

export interface JoinState {
  error?: string;
}

/**
 * Inscription d'un client depuis la page publique /join/[slug].
 *
 * Passe par la service role key (aucun accès anonyme aux tables) avec un filtre
 * explicite sur le slug du commerce. Le business_id n'est jamais fourni par le
 * navigateur : il est résolu côté serveur à partir du slug.
 */
export async function joinAction(_prev: JoinState, formData: FormData): Promise<JoinState> {
  const parsed = joinSchema.safeParse({
    businessSlug: formData.get("businessSlug"),
    firstName: formData.get("firstName"),
    phone: formData.get("phone"),
    email: formData.get("email") ?? "",
    consent: formData.get("consent") ?? false,
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    "unknown";

  pruneRateLimits();
  if (!rateLimit(`join:${ip}`, 10, 60 * 60 * 1000)) {
    return { error: "Trop de tentatives. Réessayez dans une heure." };
  }

  const { businessSlug, firstName, phone, email } = parsed.data;
  const admin = createSupabaseAdminClient();

  const { data: business } = await admin
    .from("businesses")
    .select("id")
    .eq("slug", businessSlug)
    .maybeSingle<Pick<Business, "id">>();

  if (!business) return { error: "Commerce introuvable." };

  // Un client déjà inscrit (même téléphone) retrouve simplement sa carte.
  const { data: existing } = await admin
    .from("customers")
    .select("card_token")
    .eq("business_id", business.id)
    .eq("phone", phone)
    .maybeSingle<Pick<Customer, "card_token">>();

  if (existing) redirect(`/card/${existing.card_token}?existing=1`);

  const { data: created, error } = await admin
    .from("customers")
    .insert({
      business_id: business.id,
      first_name: firstName,
      phone,
      email,
    })
    .select("card_token")
    .single<Pick<Customer, "card_token">>();

  if (error || !created) {
    return { error: "Création de la carte impossible. Réessayez." };
  }

  redirect(`/card/${created.card_token}?new=1`);
}

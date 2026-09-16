"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { joinSchema, firstError } from "@/lib/validation";
import { rateLimit, pruneRateLimits } from "@/lib/rate-limit";
import type { Business, Customer, Subscription } from "@/lib/db.types";
import { canCreateCustomer, subscriptionAccess } from "@/lib/loyalty";
import { sendWelcomeEmail } from "@/lib/email/card-delivery";

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

  // Quota du palier gratuit : vérifié côté serveur, jamais dans le navigateur.
  const [{ data: subscription }, { count }] = await Promise.all([
    admin
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("business_id", business.id)
      .maybeSingle<Pick<Subscription, "status" | "current_period_end">>(),
    admin
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id),
  ]);

  const access = subscriptionAccess(subscription ?? null);

  // Un client déjà inscrit (même téléphone) retrouve simplement sa carte.
  const { data: existing } = await admin
    .from("customers")
    .select("card_token")
    .eq("business_id", business.id)
    .eq("phone", phone)
    .maybeSingle<Pick<Customer, "card_token">>();

  if (existing) redirect(`/card/${existing.card_token}?existing=1`);

  // Le contrôle vient après la recherche d'un client existant : un client déjà
  // inscrit doit toujours pouvoir retrouver sa carte, quota atteint ou non.
  if (!canCreateCustomer(access, count ?? 0)) {
    return {
      error:
        "Ce commerce ne peut pas accepter de nouvelle carte pour le moment. Signalez-le au commerçant.",
    };
  }

  const { data: created, error } = await admin
    .from("customers")
    .insert({
      business_id: business.id,
      first_name: firstName,
      phone,
      email,
    })
    .select("*")
    .single<Customer>();

  if (error || !created) {
    return { error: "Création de la carte impossible. Réessayez." };
  }

  // L'email met la carte à l'abri d'un lien perdu. Il ne doit jamais faire
  // échouer l'inscription : le client a déjà sa carte à l'écran.
  try {
    await sendWelcomeEmail(created);
  } catch {
    // tracé dans la table messages si l'insertion a eu lieu
  }

  redirect(`/card/${created.card_token}?new=1`);
}

import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Business, Profile, Subscription } from "@/lib/db.types";
import { subscriptionAccess, type SubscriptionAccess } from "@/lib/loyalty";

export interface MerchantSession {
  userId: string;
  email: string;
  businessId: string;
  business: Business;
  profile: Profile;
  subscription: Subscription | null;
  /** Accès aux fonctionnalités, avec palier gratuit et période de grâce. */
  access: SubscriptionAccess;
  /** Nombre de cartes clients déjà créées, pour le quota du palier gratuit. */
  customerCount: number;
}

/**
 * Garde d'accès du dashboard : exige une session valide et retourne le
 * business_id. Le business_id ne vient JAMAIS du navigateur.
 */
export async function requireMerchant(): Promise<MerchantSession> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (!profile) redirect("/login?error=profil-introuvable");

  const [{ data: business }, { data: subscription }, { count }] = await Promise.all([
    supabase.from("businesses").select("*").eq("id", profile.business_id).maybeSingle<Business>(),
    supabase
      .from("subscriptions")
      .select("*")
      .eq("business_id", profile.business_id)
      .maybeSingle<Subscription>(),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("business_id", profile.business_id),
  ]);

  if (!business) redirect("/login?error=commerce-introuvable");

  return {
    userId: user.id,
    email: user.email ?? "",
    businessId: profile.business_id,
    business,
    profile,
    subscription: subscription ?? null,
    access: subscriptionAccess(subscription ?? null),
    customerCount: count ?? 0,
  };
}

/** Variante sans redirection, pour les pages publiques / la landing. */
export async function getMerchantOrNull(): Promise<{ userId: string } | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { userId: user.id } : null;
}

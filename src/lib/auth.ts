import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Business, Profile, Subscription } from "@/lib/db.types";
import { hasActiveSubscription, subscriptionAccess, type SubscriptionAccess } from "@/lib/loyalty";

export interface MerchantSession {
  userId: string;
  email: string;
  businessId: string;
  business: Business;
  profile: Profile;
  subscription: Subscription | null;
  /** Accès aux fonctionnalités payantes (emails, campagnes). */
  subscriptionActive: boolean;
  /** Accès à l'enregistrement des visites, avec période de grâce. */
  access: SubscriptionAccess;
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

  const [{ data: business }, { data: subscription }] = await Promise.all([
    supabase.from("businesses").select("*").eq("id", profile.business_id).maybeSingle<Business>(),
    supabase
      .from("subscriptions")
      .select("*")
      .eq("business_id", profile.business_id)
      .maybeSingle<Subscription>(),
  ]);

  if (!business) redirect("/login?error=commerce-introuvable");

  return {
    userId: user.id,
    email: user.email ?? "",
    businessId: profile.business_id,
    business,
    profile,
    subscription: subscription ?? null,
    subscriptionActive: hasActiveSubscription(subscription ?? null),
    access: subscriptionAccess(subscription ?? null),
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

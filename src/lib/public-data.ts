import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { cardTokenSchema } from "@/lib/validation";
import type { Business, Customer, LoyaltyProgram, Reward } from "@/lib/db.types";

/**
 * Lectures des pages publiques (/join, /card).
 * Toujours filtrées explicitement sur le slug ou le card_token.
 */

/**
 * Prénom du parrain, pour l'afficher sur la page d'inscription.
 * Le code ne donne accès à rien d'autre — ni à la carte, ni aux points.
 */
export async function getReferrerFirstName(
  businessId: string,
  referralCode: string,
): Promise<string | null> {
  if (!/^[a-f0-9]{8}$/.test(referralCode)) return null;

  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("customers")
    .select("first_name")
    .eq("business_id", businessId)
    .eq("referral_code", referralCode)
    .maybeSingle<Pick<Customer, "first_name">>();

  return data?.first_name ?? null;
}

export async function getBusinessBySlug(
  slug: string,
): Promise<{ business: Business; program: LoyaltyProgram | null } | null> {
  if (!/^[a-z0-9-]{1,50}$/.test(slug)) return null;

  const admin = createSupabaseAdminClient();
  const { data: business } = await admin
    .from("businesses")
    .select("*")
    .eq("slug", slug)
    .maybeSingle<Business>();

  if (!business) return null;

  const { data: program } = await admin
    .from("loyalty_programs")
    .select("*")
    .eq("business_id", business.id)
    .eq("active", true)
    .maybeSingle<LoyaltyProgram>();

  return { business, program: program ?? null };
}

export interface CardData {
  customer: Customer;
  business: Business;
  program: LoyaltyProgram | null;
  availableRewards: Reward[];
}

export async function getCardByToken(token: string): Promise<CardData | null> {
  const parsed = cardTokenSchema.safeParse(token);
  if (!parsed.success) return null;

  const admin = createSupabaseAdminClient();
  const { data: customer } = await admin
    .from("customers")
    .select("*")
    .eq("card_token", parsed.data)
    .maybeSingle<Customer>();

  if (!customer) return null;

  const [{ data: business }, { data: program }, { data: rewards }] = await Promise.all([
    admin.from("businesses").select("*").eq("id", customer.business_id).maybeSingle<Business>(),
    admin
      .from("loyalty_programs")
      .select("*")
      .eq("business_id", customer.business_id)
      .eq("active", true)
      .maybeSingle<LoyaltyProgram>(),
    admin
      .from("rewards")
      .select("*")
      .eq("customer_id", customer.id)
      .eq("status", "available")
      .order("earned_at", { ascending: true })
      .returns<Reward[]>(),
  ]);

  if (!business) return null;

  return {
    customer,
    business,
    program: program ?? null,
    availableRewards: rewards ?? [],
  };
}

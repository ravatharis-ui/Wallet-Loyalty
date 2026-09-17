"use server";

import { revalidatePath } from "next/cache";
import { requireMerchant } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cardTokenSchema, uuidSchema, amountSchema } from "@/lib/validation";
import { notifyRewardAvailable } from "@/lib/email/notify";
import type {
  AddVisitResult,
  Customer,
  LoyaltyProgram,
  RedeemResult,
  RewardTier,
} from "@/lib/db.types";

export interface CustomerSummary {
  id: string;
  /** Le mode décide si le scanner demande un montant. */
  mode: "stamp" | "amount";
  pointsPerEuro: number;
  firstName: string;
  currentPoints: number;
  totalVisits: number;
  lastVisitAt: string | null;
  /** Catalogue du commerce, du moins cher au plus cher. */
  tiers: { id: string; name: string; pointsCost: number }[];
  /**
   * Récompenses acquises sous l'ancien modèle à seuil unique, pas encore
   * utilisées. Elles restent dues au client et s'échangent depuis Récompenses.
   */
  legacyRewards: number;
}

export interface LookupResult {
  error?: string;
  customer?: CustomerSummary;
}

async function buildSummary(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  businessId: string,
  customer: Customer,
): Promise<LookupResult> {
  const [{ data: program }, { count }, { data: tiers }] = await Promise.all([
    supabase
      .from("loyalty_programs")
      .select("*")
      .eq("business_id", businessId)
      .eq("active", true)
      .maybeSingle<LoyaltyProgram>(),
    supabase
      .from("rewards")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customer.id)
      .eq("status", "available"),
    supabase
      .from("reward_tiers")
      .select("*")
      .eq("business_id", businessId)
      .eq("active", true)
      .order("points_cost", { ascending: true })
      .returns<RewardTier[]>(),
  ]);

  if (!program) {
    return { error: "Aucun programme de fidélité actif. Configurez-le dans l'onglet Fidélité." };
  }

  return {
    customer: {
      id: customer.id,
      mode: program.mode,
      pointsPerEuro: program.points_per_euro,
      firstName: customer.first_name,
      currentPoints: customer.current_points,
      totalVisits: customer.total_visits,
      lastVisitAt: customer.last_visit_at,
      tiers: (tiers ?? []).map((tier) => ({
        id: tier.id,
        name: tier.name,
        pointsCost: tier.points_cost,
      })),
      legacyRewards: count ?? 0,
    },
  };
}

/** Recherche d'un client à partir du QR scanné. Le token n'est jamais fait confiance tel quel. */
export async function lookupCustomerAction(rawToken: string): Promise<LookupResult> {
  const session = await requireMerchant();

  const parsed = cardTokenSchema.safeParse(extractToken(rawToken));
  if (!parsed.success) return { error: "QR code non reconnu." };

  const supabase = await createSupabaseServerClient();
  // RLS : impossible de lire le client d'un autre commerce.
  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("card_token", parsed.data)
    .eq("business_id", session.businessId)
    .maybeSingle<Customer>();

  if (!customer) return { error: "Cette carte n'appartient pas à votre commerce." };

  return buildSummary(supabase, session.businessId, customer);
}

/** Recherche manuelle par téléphone ou prénom (secours si la caméra ne marche pas). */
export async function searchCustomerAction(query: string): Promise<LookupResult> {
  const session = await requireMerchant();
  const term = query.trim().slice(0, 40);
  if (term.length < 2) return { error: "Saisissez au moins 2 caractères." };

  const supabase = await createSupabaseServerClient();
  const escaped = term.replace(/[%_,()]/g, " ");
  const { data: customers } = await supabase
    .from("customers")
    .select("*")
    .eq("business_id", session.businessId)
    .or(`phone.ilike.%${escaped}%,first_name.ilike.%${escaped}%`)
    .limit(2)
    .returns<Customer[]>();

  if (!customers || customers.length === 0) return { error: "Aucun client trouvé." };
  if (customers.length > 1) return { error: "Plusieurs clients correspondent, précisez." };

  return buildSummary(supabase, session.businessId, customers[0]);
}

export interface AddVisitState {
  error?: string;
  duplicate?: boolean;
  result?: {
    firstName: string;
    currentPoints: number;
    totalVisits: number;
    pointsAdded: number;
    affordableRewards: number;
    nextRewardName: string | null;
    nextRewardCost: number | null;
    referralRewarded: boolean;
    referralNote: "min_amount" | "monthly_limit" | null;
  };
}

/**
 * Ajoute une visite. L'atomicité, le contrôle d'appartenance et la protection
 * anti-doublon sont assurés par la fonction SQL `add_visit`.
 */
export async function addVisitAction(customerId: string, amount?: string): Promise<AddVisitState> {
  const session = await requireMerchant();

  if (session.access.level === "blocked") {
    return {
      error:
        "Votre abonnement a expiré. Réactivez-le dans Réglages pour enregistrer de nouvelles visites — vos clients et leurs points sont conservés.",
    };
  }

  const parsed = uuidSchema.safeParse(customerId);
  if (!parsed.success) return { error: "Client invalide." };

  // Le montant n'est validé que s'il est fourni : en mode tampon, la fonction
  // SQL l'ignore, et c'est elle qui exige le montant en mode points.
  let amountCents: number | null = null;
  if (amount !== undefined && amount !== "") {
    const parsedAmount = amountSchema.safeParse(amount);
    if (!parsedAmount.success) return { error: "Montant invalide." };
    amountCents = parsedAmount.data;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("add_visit", {
    p_customer_id: parsed.data,
    p_business_id: session.businessId,
    p_amount_cents: amountCents,
  });

  if (error) {
    if (error.message.includes("no_active_program")) {
      return { error: "Aucun programme de fidélité actif." };
    }
    if (error.message.includes("customer_not_found")) {
      return { error: "Client introuvable." };
    }
    if (error.message.includes("amount_required")) {
      return { error: "Saisissez le montant de l'achat." };
    }
    if (error.message.includes("amount_too_small")) {
      return { error: "Montant trop faible pour rapporter des points." };
    }
    return { error: "Visite non enregistrée. Réessayez." };
  }

  const result = data as AddVisitResult;

  // Le client vient d'avoir de quoi échanger : on le prévient une fois, et
  // `notifyRewardAvailable` se charge de ne pas se répéter.
  if (result.affordable_rewards > 0) {
    const { data: best } = await supabase
      .from("reward_tiers")
      .select("name")
      .eq("business_id", session.businessId)
      .eq("active", true)
      .lte("points_cost", result.current_points)
      .order("points_cost", { ascending: false })
      .limit(1)
      .maybeSingle<{ name: string }>();

    if (best) {
      // L'email ne doit jamais faire échouer l'enregistrement de la visite.
      try {
        await notifyRewardAvailable({
          businessId: session.businessId,
          customerId: result.customer_id,
          rewardName: best.name,
        });
      } catch {
        // tracé par la table messages si l'insertion a eu lieu
      }
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/customers");
  revalidatePath("/dashboard/rewards");

  return {
    duplicate: result.duplicate,
    result: {
      firstName: result.first_name,
      currentPoints: result.current_points,
      totalVisits: result.total_visits,
      pointsAdded: result.points_added,
      affordableRewards: result.affordable_rewards,
      nextRewardName: result.next_reward_name,
      nextRewardCost: result.next_reward_cost,
      referralRewarded: result.referral_rewarded,
      referralNote: result.referral_note,
    },
  };
}

/** Le QR encode le token brut, mais on accepte aussi une URL /card/<token>. */
function extractToken(raw: string): string {
  const value = raw.trim();
  const match = value.match(/([a-f0-9]{32})/i);
  return match ? match[1].toLowerCase() : value;
}

export interface RedeemTierState {
  error?: string;
  success?: string;
}

/**
 * Échange un palier contre les points du client.
 *
 * Tout se joue dans `redeem_reward` : verrou sur la ligne client, contrôle du
 * solde et débit dans la même transaction. Deux commerçants qui valident en
 * même temps ne peuvent pas offrir deux fois la même récompense.
 */
export async function redeemTierAction(
  customerId: string,
  tierId: string,
): Promise<RedeemTierState> {
  const session = await requireMerchant();

  const customer = uuidSchema.safeParse(customerId);
  const tier = uuidSchema.safeParse(tierId);
  if (!customer.success || !tier.success) return { error: "Échange impossible." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("redeem_reward", {
    p_customer_id: customer.data,
    p_business_id: session.businessId,
    p_tier_id: tier.data,
  });

  if (error) {
    if (error.message.includes("tier_not_found")) return { error: "Récompense introuvable." };
    if (error.message.includes("customer_not_found")) return { error: "Client introuvable." };
    return { error: "Échange impossible. Réessayez." };
  }

  const result = data as RedeemResult;
  if (!result.ok) {
    return {
      error: `Il manque ${result.points_cost - result.current_points} points pour cette récompense.`,
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/rewards");
  revalidatePath("/dashboard/customers");

  return {
    success: `${result.reward_name} échangé pour ${result.points_spent} points. Il reste ${result.current_points} points.`,
  };
}

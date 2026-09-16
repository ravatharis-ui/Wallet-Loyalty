"use server";

import { revalidatePath } from "next/cache";
import { requireMerchant } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cardTokenSchema, uuidSchema, amountSchema } from "@/lib/validation";
import { notifyRewardAvailable } from "@/lib/email/notify";
import type { AddVisitResult, Customer, LoyaltyProgram, Reward } from "@/lib/db.types";

export interface CustomerSummary {
  id: string;
  /** Le mode décide si le scanner demande un montant. */
  mode: "stamp" | "amount";
  pointsPerEuro: number;
  firstName: string;
  currentPoints: number;
  totalVisits: number;
  lastVisitAt: string | null;
  rewardThreshold: number;
  rewardName: string;
  availableRewards: number;
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
  const [{ data: program }, { count }] = await Promise.all([
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
      rewardThreshold: program.reward_threshold,
      rewardName: program.reward_name,
      availableRewards: count ?? 0,
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
    rewardThreshold: number;
    pointsAdded: number;
    rewardsCreated: number;
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

  if (result.rewards_created > 0) {
    const { data: reward } = await supabase
      .from("rewards")
      .select("*")
      .eq("customer_id", result.customer_id)
      .eq("status", "available")
      .order("earned_at", { ascending: false })
      .limit(1)
      .maybeSingle<Reward>();

    if (reward) {
      // L'email ne doit jamais faire échouer l'enregistrement de la visite.
      try {
        await notifyRewardAvailable({
          businessId: session.businessId,
          customerId: result.customer_id,
          rewardName: reward.reward_name,
          earnedAt: reward.earned_at,
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
      rewardThreshold: result.reward_threshold,
      pointsAdded: result.points_added,
      rewardsCreated: result.rewards_created,
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

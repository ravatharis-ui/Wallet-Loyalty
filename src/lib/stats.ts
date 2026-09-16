import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { INACTIVITY_30_DAYS } from "@/lib/loyalty";
import type { Customer, Visit } from "@/lib/db.types";
import { bucketVisitsByMonth, historyStart, type VisitsPoint } from "@/lib/visits-history";

export interface DashboardStats {
  customers: number;
  visitsThisMonth: number;
  rewardsRedeemed: number;
  toReengage: number;
  inactiveCustomers: Pick<Customer, "id" | "first_name" | "last_visit_at">[];
  /** Visites des six derniers mois, mois courant inclus. */
  visitsByMonth: VisitsPoint[];
  /** Clients arrivés par parrainage. */
  referred: number;
}

/** Date limite d'inactivité (30 jours) au format ISO. */
export function inactivityCutoff(days = INACTIVITY_30_DAYS, now = new Date()): string {
  return new Date(now.getTime() - days * 86_400_000).toISOString();
}

export async function getDashboardStats(businessId: string): Promise<DashboardStats> {
  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const cutoff = inactivityCutoff(INACTIVITY_30_DAYS, now);

  const [customers, visits, rewards, inactive, history, referred] = await Promise.all([
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId),
    supabase
      .from("visits")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .gte("created_at", monthStart),
    supabase
      .from("rewards")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("status", "redeemed"),
    supabase
      .from("customers")
      .select("id, first_name, last_visit_at", { count: "exact" })
      .eq("business_id", businessId)
      .not("last_visit_at", "is", null)
      .lt("last_visit_at", cutoff)
      .order("last_visit_at", { ascending: true })
      .limit(5)
      .returns<Pick<Customer, "id" | "first_name" | "last_visit_at">[]>(),
    // Seules les dates sont chargées, et l'agrégation se fait en mémoire :
    // à l'échelle d'un commerce, cela reste quelques centaines de lignes.
    supabase
      .from("visits")
      .select("created_at")
      .eq("business_id", businessId)
      .gte("created_at", historyStart(now))
      .limit(10_000)
      .returns<Pick<Visit, "created_at">[]>(),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .not("referred_by", "is", null),
  ]);

  return {
    customers: customers.count ?? 0,
    visitsThisMonth: visits.count ?? 0,
    rewardsRedeemed: rewards.count ?? 0,
    toReengage: inactive.count ?? 0,
    inactiveCustomers: inactive.data ?? [],
    referred: referred.count ?? 0,
    visitsByMonth: bucketVisitsByMonth(
      (history.data ?? []).map((visit) => visit.created_at),
      now,
    ),
  };
}

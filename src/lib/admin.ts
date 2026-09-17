import "server-only";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { optionalEnv } from "@/lib/env";
import { daysSince } from "@/lib/loyalty";
import type { Business, Subscription, SubscriptionStatus } from "@/lib/db.types";

/** Au-delà, un commerce qui ne scanne plus mérite un appel. */
export const SILENCE_ALERT_DAYS = 7;

/**
 * Accès à l'espace d'administration.
 *
 * La liste des adresses autorisées vit dans une variable d'environnement, pas
 * en base : pas de nouveau rôle, pas de politique RLS supplémentaire à faire
 * cohabiter avec l'existante. Moins de mécanismes, moins de surface d'erreur
 * sur un écran qui, mal protégé, exposerait tous les commerces d'un coup.
 */
export async function requireAdmin(): Promise<{ email: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const allowed = (optionalEnv("ADMIN_EMAILS") ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  const email = (user.email ?? "").toLowerCase();

  // 404 plutôt que 403 : inutile de confirmer l'existence de la page à
  // quelqu'un qui n'y a pas droit.
  if (allowed.length === 0 || !allowed.includes(email)) notFound();

  return { email };
}

export interface MerchantHealth {
  businessId: string;
  name: string;
  slug: string;
  createdAt: string;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  customers: number;
  newCustomersThisMonth: number;
  visits7: number;
  visits30: number;
  lastVisitAt: string | null;
  /** Jours depuis le dernier scan. `null` si aucun scan n'a jamais eu lieu. */
  silentDays: number | null;
  pushSubscribers: number;
  messagesSent30: number;
  /** Part des clients revenus au moins deux fois, en pourcentage. */
  returnRate: number | null;
}

/** Bornes de lecture : à l'échelle d'un portefeuille de commerces, largement suffisant. */
const MAX_ROWS = 50_000;

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function startOfMonth(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

/**
 * État de santé de chaque commerce.
 *
 * Volontairement limité à des compteurs : aucun prénom, téléphone ou email de
 * client final n'entre ici. On n'en a pas besoin pour savoir si un commerce
 * s'en sert, et un commerçant nous confie ces données pour qu'elles servent
 * son programme, pas notre tableau de bord.
 */
export async function getMerchantHealth(): Promise<MerchantHealth[]> {
  const admin = createSupabaseAdminClient();
  const since30 = isoDaysAgo(30);
  const since7 = isoDaysAgo(7);
  const monthStart = startOfMonth();

  const [businesses, subscriptions, visits, customers, pushRows, messages] = await Promise.all([
    admin.from("businesses").select("*").returns<Business[]>(),
    admin.from("subscriptions").select("*").returns<Subscription[]>(),
    admin
      .from("visits")
      .select("business_id, created_at")
      .gte("created_at", since30)
      .limit(MAX_ROWS)
      .returns<{ business_id: string; created_at: string }[]>(),
    admin
      .from("customers")
      .select("business_id, created_at, total_visits, last_visit_at")
      .limit(MAX_ROWS)
      .returns<
        {
          business_id: string;
          created_at: string;
          total_visits: number;
          last_visit_at: string | null;
        }[]
      >(),
    admin
      .from("push_subscriptions")
      .select("business_id, customer_id")
      .limit(MAX_ROWS)
      .returns<{ business_id: string; customer_id: string }[]>(),
    admin
      .from("messages")
      .select("business_id, status, created_at")
      .eq("status", "sent")
      .gte("created_at", since30)
      .limit(MAX_ROWS)
      .returns<{ business_id: string; status: string; created_at: string }[]>(),
  ]);

  const subscriptionByBusiness = new Map(
    (subscriptions.data ?? []).map((row) => [row.business_id, row]),
  );

  return (businesses.data ?? [])
    .map((business): MerchantHealth => {
      const ownVisits = (visits.data ?? []).filter((row) => row.business_id === business.id);
      const ownCustomers = (customers.data ?? []).filter((row) => row.business_id === business.id);

      // Un client peut avoir plusieurs appareils : on compte les personnes.
      const subscribers = new Set(
        (pushRows.data ?? [])
          .filter((row) => row.business_id === business.id)
          .map((row) => row.customer_id),
      );

      const lastVisitAt = ownCustomers.reduce<string | null>((latest, customer) => {
        if (!customer.last_visit_at) return latest;
        return !latest || customer.last_visit_at > latest ? customer.last_visit_at : latest;
      }, null);

      const returning = ownCustomers.filter((customer) => customer.total_visits >= 2).length;
      const subscription = subscriptionByBusiness.get(business.id);

      return {
        businessId: business.id,
        name: business.name,
        slug: business.slug,
        createdAt: business.created_at,
        status: subscription?.status ?? "none",
        currentPeriodEnd: subscription?.current_period_end ?? null,
        customers: ownCustomers.length,
        newCustomersThisMonth: ownCustomers.filter((row) => row.created_at >= monthStart).length,
        visits7: ownVisits.filter((row) => row.created_at >= since7).length,
        visits30: ownVisits.length,
        lastVisitAt,
        silentDays: daysSince(lastVisitAt),
        pushSubscribers: subscribers.size,
        messagesSent30: (messages.data ?? []).filter((row) => row.business_id === business.id)
          .length,
        returnRate:
          ownCustomers.length > 0 ? Math.round((returning / ownCustomers.length) * 100) : null,
      };
    })
    .sort((a, b) => {
      // Le silence d'abord : c'est le signal qui précède la résiliation.
      const silenceA = a.silentDays ?? Number.MAX_SAFE_INTEGER;
      const silenceB = b.silentDays ?? Number.MAX_SAFE_INTEGER;
      if (silenceA !== silenceB) return silenceB - silenceA;
      return b.customers - a.customers;
    });
}

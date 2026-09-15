/**
 * Logique métier pure — aucune dépendance à Supabase, Stripe ou React.
 * Sert de référence testable pour le comportement implémenté en SQL (add_visit)
 * et pour l'affichage côté carte / dashboard.
 */

import type { MessageType, SubscriptionStatus } from "@/lib/db.types";

export const INACTIVITY_30_DAYS = 30;
export const INACTIVITY_60_DAYS = 60;
/** Au-delà, on considère que la relance n'a plus de sens. */
export const INACTIVITY_MAX_DAYS = 180;

export interface ProgramRules {
  points_per_visit: number;
  reward_threshold: number;
}

export interface LoyaltyState {
  current_points: number;
  total_visits: number;
}

export interface VisitOutcome extends LoyaltyState {
  points_added: number;
  rewards_earned: number;
}

/**
 * Applique une visite à l'état de fidélité d'un client.
 * Modèle "carte à tamponner" : chaque palier atteint consomme
 * `reward_threshold` points et crée une récompense.
 */
export function applyVisit(state: LoyaltyState, rules: ProgramRules): VisitOutcome {
  const pointsPerVisit = Math.max(1, Math.trunc(rules.points_per_visit));
  const threshold = Math.max(1, Math.trunc(rules.reward_threshold));

  let points = state.current_points + pointsPerVisit;
  let rewards = 0;

  while (points >= threshold) {
    points -= threshold;
    rewards += 1;
  }

  return {
    current_points: points,
    total_visits: state.total_visits + 1,
    points_added: pointsPerVisit,
    rewards_earned: rewards,
  };
}

/** Nombre de visites restantes avant la prochaine récompense. */
export function visitsUntilReward(currentPoints: number, rules: ProgramRules): number {
  const pointsPerVisit = Math.max(1, Math.trunc(rules.points_per_visit));
  const threshold = Math.max(1, Math.trunc(rules.reward_threshold));
  const missing = Math.max(0, threshold - currentPoints);
  return Math.ceil(missing / pointsPerVisit);
}

/** Message de progression affiché sur la carte client. */
export function progressLabel(currentPoints: number, rules: ProgramRules): string {
  const remaining = visitsUntilReward(currentPoints, rules);
  if (remaining === 0) return "Récompense disponible !";
  if (remaining === 1) return "Plus qu'une visite !";
  return `Plus que ${remaining} visites !`;
}

/** Nombre de jours entiers écoulés depuis une date. */
export function daysSince(date: Date | string | null, now: Date = new Date()): number | null {
  if (!date) return null;
  const value = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) return null;
  return Math.floor((now.getTime() - value.getTime()) / 86_400_000);
}

/** Un client est "à relancer" au-delà de 30 jours sans visite. */
export function isInactive(
  lastVisitAt: Date | string | null,
  thresholdDays: number = INACTIVITY_30_DAYS,
  now: Date = new Date(),
): boolean {
  const days = daysSince(lastVisitAt, now);
  if (days === null) return false;
  return days >= thresholdDays;
}

export interface ReminderCandidate {
  lastVisitAt: string | null;
  email: string | null;
  /** Messages déjà envoyés à ce client (type + date). */
  sentMessages: { type: MessageType; created_at: string }[];
}

/**
 * Décide si une relance d'inactivité doit partir.
 *
 * Règles :
 * - il faut un email,
 * - il faut avoir dépassé le seuil (30 ou 60 jours) sans le dépasser absurdement,
 * - on n'envoie jamais deux fois le même type de relance depuis la dernière visite
 *   (si le client est revenu, le compteur repart).
 */
export function shouldSendInactivityReminder(
  candidate: ReminderCandidate,
  type: Extract<MessageType, "inactive_30_days" | "inactive_60_days">,
  now: Date = new Date(),
): boolean {
  if (!candidate.email) return false;

  const days = daysSince(candidate.lastVisitAt, now);
  if (days === null) return false;

  const threshold = type === "inactive_30_days" ? INACTIVITY_30_DAYS : INACTIVITY_60_DAYS;
  if (days < threshold || days > INACTIVITY_MAX_DAYS) return false;

  // La relance 60 jours remplace la relance 30 jours : à 60 jours on n'envoie
  // plus la relance 30 jours.
  if (type === "inactive_30_days" && days >= INACTIVITY_60_DAYS) return false;

  const lastVisit = candidate.lastVisitAt ? new Date(candidate.lastVisitAt).getTime() : 0;
  const alreadySent = candidate.sentMessages.some(
    (m) => m.type === type && new Date(m.created_at).getTime() >= lastVisit,
  );

  return !alreadySent;
}

/** Une seule notification "récompense disponible" par récompense gagnée. */
export function shouldNotifyReward(
  candidate: Pick<ReminderCandidate, "email" | "sentMessages">,
  rewardEarnedAt: string,
): boolean {
  if (!candidate.email) return false;
  const earned = new Date(rewardEarnedAt).getTime();
  return !candidate.sentMessages.some(
    (m) => m.type === "reward_available" && new Date(m.created_at).getTime() >= earned,
  );
}

/**
 * Le commerce a-t-il accès aux fonctionnalités payantes ?
 * Seul le statut venant de Stripe fait foi.
 */
export function hasActiveSubscription(
  subscription: { status: SubscriptionStatus; current_period_end: string | null } | null,
  now: Date = new Date(),
): boolean {
  if (!subscription) return false;
  if (subscription.status !== "active" && subscription.status !== "trialing") return false;
  if (subscription.current_period_end) {
    const end = new Date(subscription.current_period_end).getTime();
    if (!Number.isNaN(end) && end < now.getTime()) return false;
  }
  return true;
}

/** Transforme un nom de commerce en slug d'URL. */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/g, "");
}

/**
 * Logique métier pure — aucune dépendance à Supabase, Stripe ou React.
 * Sert de référence testable pour le comportement implémenté en SQL (add_visit)
 * et pour l'affichage côté carte / dashboard.
 */

import type { LoyaltyMode, MessageType, SubscriptionStatus } from "@/lib/db.types";

export const INACTIVITY_30_DAYS = 30;
export const INACTIVITY_60_DAYS = 60;
/** Au-delà, on considère que la relance n'a plus de sens. */
export const INACTIVITY_MAX_DAYS = 180;

export interface ProgramRules {
  mode?: LoyaltyMode;
  points_per_visit: number;
  points_per_euro?: number;
}

/** Un palier du catalogue : ce que le client peut s'offrir, et à quel prix. */
export interface RewardTierRules {
  id: string;
  name: string;
  points_cost: number;
}

export interface LoyaltyState {
  current_points: number;
  total_visits: number;
}

export interface VisitOutcome extends LoyaltyState {
  points_added: number;
}

/**
 * Points gagnés pour une visite.
 *
 * - mode « stamp » : un nombre fixe par passage, le montant n'entre pas en jeu ;
 * - mode « amount » : le montant dépensé, converti en euros entiers — les
 *   centimes ne rapportent rien, sinon le barème deviendrait illisible pour le
 *   client comme pour le commerçant.
 */
export function pointsForVisit(rules: ProgramRules, amountCents?: number | null): number {
  if (rules.mode === "amount") {
    const perEuro = Math.max(1, Math.trunc(rules.points_per_euro ?? 1));
    const euros = Math.floor(Math.max(0, amountCents ?? 0) / 100);
    return euros * perEuro;
  }
  return Math.max(1, Math.trunc(rules.points_per_visit));
}

/**
 * Applique une visite à l'état de fidélité d'un client.
 *
 * Les points ne sont jamais consommés ici : ils s'accumulent jusqu'à ce que le
 * client décide d'échanger un palier, ce qui est un acte explicite au comptoir.
 */
export function applyVisit(
  state: LoyaltyState,
  rules: ProgramRules,
  amountCents?: number | null,
): VisitOutcome {
  const pointsAdded = pointsForVisit(rules, amountCents);
  return {
    current_points: state.current_points + pointsAdded,
    total_visits: state.total_visits + 1,
    points_added: pointsAdded,
  };
}

/** Paliers triés du moins cher au plus cher. Source unique de l'ordre d'affichage. */
export function sortTiers<T extends RewardTierRules>(tiers: readonly T[]): T[] {
  return [...tiers].sort((a, b) => a.points_cost - b.points_cost);
}

/** Ce que le client peut s'offrir maintenant. */
export function affordableTiers<T extends RewardTierRules>(
  currentPoints: number,
  tiers: readonly T[],
): T[] {
  return sortTiers(tiers).filter((tier) => tier.points_cost <= currentPoints);
}

/** Le premier palier encore hors de portée : c'est lui qui motive le retour. */
export function nextTier<T extends RewardTierRules>(
  currentPoints: number,
  tiers: readonly T[],
): T | null {
  return sortTiers(tiers).find((tier) => tier.points_cost > currentPoints) ?? null;
}

/** Le meilleur palier accessible : celui qu'on met en avant sur la carte. */
export function bestAffordableTier<T extends RewardTierRules>(
  currentPoints: number,
  tiers: readonly T[],
): T | null {
  const affordable = affordableTiers(currentPoints, tiers);
  return affordable.length > 0 ? affordable[affordable.length - 1] : null;
}

/**
 * Nombre de visites restantes avant un palier donné.
 * N'a de sens qu'en mode tampon : en mode points, c'est un montant qui manque,
 * pas un nombre de passages.
 */
export function visitsUntilReward(
  currentPoints: number,
  rules: ProgramRules,
  pointsCost: number,
): number {
  const pointsPerVisit = Math.max(1, Math.trunc(rules.points_per_visit));
  const missing = Math.max(0, Math.trunc(pointsCost) - currentPoints);
  return Math.ceil(missing / pointsPerVisit);
}

/** Message de progression affiché sur la carte client. */
export function progressLabel(
  currentPoints: number,
  rules: ProgramRules,
  tiers: readonly RewardTierRules[],
): string {
  if (tiers.length === 0) {
    return "Cumulez des points à chaque passage.";
  }

  const best = bestAffordableTier(currentPoints, tiers);
  if (best) return `Vous pouvez échanger : ${best.name}`;

  const next = nextTier(currentPoints, tiers);
  // Sans palier abordable ni palier suivant, le catalogue serait vide : le cas
  // est déjà traité plus haut, mais TypeScript ne le sait pas.
  if (!next) return "Cumulez des points à chaque passage.";

  if (rules.mode === "amount") {
    const missing = Math.max(0, next.points_cost - currentPoints);
    if (missing === 1) return `Plus qu'un point avant ${next.name}`;
    return `Plus que ${missing} points avant ${next.name}`;
  }

  const remaining = visitsUntilReward(currentPoints, rules, next.points_cost);
  if (remaining === 1) return `Plus qu'une visite avant ${next.name}`;
  return `Plus que ${remaining} visites avant ${next.name}`;
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
  /**
   * Messages **effectivement envoyés** à ce client (type + date).
   * Les messages en échec ne doivent pas figurer ici : sinon une panne d'envoi
   * priverait définitivement le client de sa relance.
   */
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

/**
 * Délai de tolérance après la fin d'un abonnement (essai expiré, impayé,
 * résiliation) avant que l'ajout de visite soit refusé.
 *
 * Objectif : ne jamais couper le comptoir du jour au lendemain. Pendant ce
 * délai tout continue de fonctionner, avec un avertissement de plus en plus
 * insistant. Passé ce délai, la consultation reste possible : aucune donnée
 * n'est perdue, réactiver l'abonnement suffit à tout relancer.
 */
export const SUBSCRIPTION_GRACE_DAYS = 7;

/**
 * Nombre de cartes clients créables sans abonnement.
 *
 * Le commerce découvre le produit en conditions réelles — programme, QR, scan,
 * récompenses, emails — mais ne peut pas exploiter son fichier client. Pour
 * passer en illimité, il souscrit, ce qui déclenche l'essai gratuit.
 */
export const FREE_TIER_CUSTOMER_LIMIT = 3;

/**
 * - `active` : abonnement en cours (ou essai Stripe) — tout est illimité.
 * - `free`   : jamais abonné — tout fonctionne, plafonné à 3 cartes clients.
 * - `grace`  : abonnement expiré depuis moins de 7 jours — les visites
 *              continuent pour les clients existants, mais aucune nouvelle
 *              carte n'est créée et les envois d'emails sont coupés.
 * - `blocked`: au-delà — consultation seule.
 */
export type AccessLevel = "active" | "free" | "grace" | "blocked";

export interface SubscriptionAccess {
  level: AccessLevel;
  /** Jours restants avant le blocage, uniquement en période de grâce. */
  graceDaysLeft: number | null;
  /** Nombre de cartes créables, `null` si illimité. */
  customerLimit: number | null;
}

export function subscriptionAccess(
  subscription: { status: SubscriptionStatus; current_period_end: string | null } | null,
  now: Date = new Date(),
): SubscriptionAccess {
  if (hasActiveSubscription(subscription, now)) {
    return { level: "active", graceDaysLeft: null, customerLimit: null };
  }

  const end = subscription?.current_period_end
    ? new Date(subscription.current_period_end).getTime()
    : null;

  // Aucune période enregistrée : ce commerce n'a jamais souscrit.
  if (end === null || Number.isNaN(end)) {
    return { level: "free", graceDaysLeft: null, customerLimit: FREE_TIER_CUSTOMER_LIMIT };
  }

  const graceEnd = end + SUBSCRIPTION_GRACE_DAYS * 86_400_000;
  if (now.getTime() < graceEnd) {
    return {
      level: "grace",
      graceDaysLeft: Math.max(1, Math.ceil((graceEnd - now.getTime()) / 86_400_000)),
      // Un commerce expiré continue de servir ses clients, mais ne recrute plus :
      // laisser la limite du palier gratuit donnerait une règle incohérente
      // selon la taille du fichier client.
      customerLimit: 0,
    };
  }

  return { level: "blocked", graceDaysLeft: null, customerLimit: 0 };
}

/** Une nouvelle carte client peut-elle être créée ? */
export function canCreateCustomer(access: SubscriptionAccess, currentCount: number): boolean {
  if (access.level === "blocked") return false;
  if (access.customerLimit === null) return true;
  return currentCount < access.customerLimit;
}

/** Les envois d'emails sont réservés au gratuit et à l'abonnement en cours. */
export function canSendEmails(access: SubscriptionAccess): boolean {
  return access.level === "active" || access.level === "free";
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

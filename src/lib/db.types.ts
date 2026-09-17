/**
 * Types de la base de données.
 * Écrits à la main pour rester lisibles et alignés sur supabase/migrations.
 */

/** Carte à tamponner, ou points selon le montant dépensé. */
export type LoyaltyMode = "stamp" | "amount";

export type RewardStatus = "available" | "redeemed" | "expired";
export type MessageType =
  | "welcome"
  | "card_recovery"
  | "inactive_30_days"
  | "inactive_60_days"
  | "reward_available"
  | "campaign";
export type MessageChannel = "email" | "sms" | "push";
export type MessageStatus = "pending" | "sent" | "failed" | "skipped";
export type AudienceType =
  "all" | "inactive_30_days" | "reward_available" | "new_this_month" | "best_customers";
export type CampaignChannel = "email" | "push" | "both";
export type CampaignStatus = "draft" | "scheduled" | "sent";
export type SubscriptionStatus =
  | "none"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused";

export interface Business {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  /** Couleur principale de la carte client, au format #rrggbb. */
  card_color: string;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  business_id: string;
  role: "merchant" | "staff";
  created_at: string;
}

export interface LoyaltyProgram {
  id: string;
  business_id: string;
  name: string;
  mode: LoyaltyMode;
  points_per_visit: number;
  /** Points gagnés par euro dépensé, en mode « amount ». */
  points_per_euro: number;
  /** Points offerts au parrain et au filleul. Zéro désactive le parrainage. */
  referral_points: number;
  /** Achat minimum du filleul pour valider le parrainage. Zéro = aucune condition. */
  referral_min_amount_cents: number;
  /** Parrainages récompensés par client sur 30 jours. Zéro = illimité. */
  referral_monthly_limit: number;
  /**
   * Héritage du modèle à seuil unique, conservé en base pour ne rien casser.
   * Les récompenses vivent désormais dans `reward_tiers` : ne plus lire ces
   * deux colonnes depuis l'application.
   */
  reward_threshold: number;
  reward_name: string;
  reward_description: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

/** Un palier du catalogue de récompenses d'un commerce. */
export interface RewardTier {
  id: string;
  business_id: string;
  name: string;
  points_cost: number;
  position: number;
  active: boolean;
  created_at: string;
}

export interface Customer {
  id: string;
  business_id: string;
  first_name: string;
  phone: string;
  email: string | null;
  card_token: string;
  /** Code public partageable — distinct du card_token, qui donne accès à la carte. */
  referral_code: string;
  /** Client qui a parrainé celui-ci, le cas échéant. */
  referred_by: string | null;
  /** Date de versement du bonus de parrainage, nulle s'il n'a pas été versé. */
  referral_rewarded_at: string | null;
  /** Dernière fois que le client a été prévenu qu'il pouvait échanger. */
  reward_notified_at: string | null;
  total_visits: number;
  current_points: number;
  last_visit_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Visit {
  id: string;
  business_id: string;
  customer_id: string;
  points_added: number;
  /** Montant de l'achat en centimes, uniquement en mode « amount ». */
  amount_cents: number | null;
  created_at: string;
  created_by: string | null;
}

export interface Reward {
  id: string;
  business_id: string;
  customer_id: string;
  loyalty_program_id: string;
  reward_tier_id: string | null;
  status: RewardStatus;
  reward_name: string;
  /** Points débités lors de l'échange. */
  points_spent: number;
  earned_at: string;
  redeemed_at: string | null;
  expires_at: string | null;
}

export interface Message {
  id: string;
  business_id: string;
  customer_id: string;
  type: MessageType;
  channel: MessageChannel;
  status: MessageStatus;
  subject: string | null;
  content: string;
  sent_at: string | null;
  created_at: string;
}

export interface Campaign {
  id: string;
  business_id: string;
  name: string;
  /** Objet de l'email. Vide, on retombe sur le nom de la campagne. */
  subject: string | null;
  message: string;
  image_url: string | null;
  channel: CampaignChannel;
  audience_type: AudienceType;
  status: CampaignStatus;
  recipients: number;
  scheduled_at: string | null;
  created_at: string;
  sent_at: string | null;
}

export interface Subscription {
  id: string;
  business_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: SubscriptionStatus;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

/** Résultat de la fonction SQL `add_visit`. */
export interface AddVisitResult {
  duplicate: boolean;
  customer_id: string;
  first_name: string;
  current_points: number;
  total_visits: number;
  points_added: number;
  /** Nombre de paliers que le solde permet d'échanger immédiatement. */
  affordable_rewards: number;
  /** Prochain palier hors de portée, s'il en reste un. */
  next_reward_name: string | null;
  next_reward_cost: number | null;
  referral_rewarded: boolean;
  /** Motif de non-versement : « min_amount », « monthly_limit », ou null. */
  referral_note: "min_amount" | "monthly_limit" | null;
}

/** Résultat de l'échange d'un palier au comptoir. */
export type RedeemResult =
  | { ok: true; reward_name: string; points_spent: number; current_points: number }
  | { ok: false; reason: "insufficient_points"; current_points: number; points_cost: number };

/** Abonnement push d'un appareil du client. */
export interface PushSubscriptionRow {
  id: string;
  business_id: string;
  customer_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
  last_used_at: string | null;
}

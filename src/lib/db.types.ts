/**
 * Types de la base de données.
 * Écrits à la main pour rester lisibles et alignés sur supabase/migrations.
 */

export type RewardStatus = "available" | "redeemed" | "expired";
export type MessageType = "inactive_30_days" | "inactive_60_days" | "reward_available" | "campaign";
export type MessageChannel = "email" | "sms";
export type MessageStatus = "pending" | "sent" | "failed" | "skipped";
export type AudienceType = "all" | "inactive_30_days" | "reward_available";
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
  points_per_visit: number;
  reward_threshold: number;
  reward_name: string;
  reward_description: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  business_id: string;
  first_name: string;
  phone: string;
  email: string | null;
  card_token: string;
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
  created_at: string;
  created_by: string | null;
}

export interface Reward {
  id: string;
  business_id: string;
  customer_id: string;
  loyalty_program_id: string;
  status: RewardStatus;
  reward_name: string;
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
  message: string;
  audience_type: AudienceType;
  recipients: number;
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
  reward_threshold: number;
  rewards_created: number;
  reward_ids: string[];
}

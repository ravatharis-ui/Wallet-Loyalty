import { z } from "zod";

const trimmed = (min: number, max: number) => z.string().trim().min(min).max(max);

/** Numéro de téléphone : on reste permissif (formats FR et internationaux). */
export const phoneSchema = z
  .string()
  .trim()
  .min(6, "Numéro de téléphone trop court")
  .max(30, "Numéro de téléphone trop long")
  .regex(/^[+0-9][0-9 .\-()]{4,}$/, "Numéro de téléphone invalide");

export const optionalEmailSchema = z
  .union([z.string().trim().email("Email invalide"), z.literal("")])
  .optional()
  .transform((v) => (v && v.length > 0 ? v.toLowerCase() : null));

/** Email obligatoire : sans lui, aucune relance n'est possible. */
export const requiredEmailSchema = z
  .string()
  .trim()
  .min(1, "Email requis")
  .email("Email invalide")
  .transform((value) => value.toLowerCase());

export const signupSchema = z.object({
  businessName: trimmed(2, 80),
  email: z.string().trim().email("Email invalide"),
  password: z.string().min(8, "Mot de passe : 8 caractères minimum").max(72),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis").max(72),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Email invalide"),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Mot de passe : 8 caractères minimum").max(72),
    confirmation: z.string(),
  })
  .refine((data) => data.password === data.confirmation, {
    message: "Les deux mots de passe ne correspondent pas",
  });

export const businessSchema = z.object({
  name: trimmed(2, 80),
  phone: z
    .union([phoneSchema, z.literal("")])
    .optional()
    .transform((v) => (v ? v : null)),
  email: optionalEmailSchema,
  cardColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide")
    .transform((value) => value.toLowerCase()),
});

/** Logo du commerce : formats bitmap courants, 1 Mo maximum. */
export const LOGO_MAX_BYTES = 1024 * 1024;
export const LOGO_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export const loyaltyProgramSchema = z.object({
  name: trimmed(2, 80),
  mode: z.enum(["stamp", "amount"]).default("stamp"),
  pointsPerVisit: z.coerce.number().int().min(1).max(100),
  pointsPerEuro: z.coerce.number().int().min(1).max(100).default(1),
  referralPoints: z.coerce.number().int().min(0).max(10000).default(0),
  referralMinAmount: z
    .string()
    .trim()
    .optional()
    .transform((value) => {
      if (!value) return 0;
      const amount = Number(value.replace(",", "."));
      if (!Number.isFinite(amount) || amount <= 0) return 0;
      return Math.round(Math.min(1_000_000, amount) * 100);
    }),
  referralMonthlyLimit: z.coerce.number().int().min(0).max(1000).default(0),
  active: z.coerce.boolean().optional().default(true),
});

/**
 * Un palier du catalogue. Le coût est exprimé dans l'unité du programme :
 * des visites en mode tampon, des points en mode montant.
 */
export const rewardTierSchema = z.object({
  name: trimmed(2, 80),
  pointsCost: z.coerce.number().int().min(1).max(100_000),
});

/** Code de parrainage : 8 caractères hexadécimaux, sans valeur d'accès. */
export const referralCodeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-f0-9]{8}$/, "Code de parrainage invalide");

export const joinSchema = z.object({
  businessSlug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{1,50}$/, "Commerce introuvable"),
  /** Code du parrain, absent la plupart du temps. */
  referral: z
    .union([referralCodeSchema, z.literal("")])
    .optional()
    .transform((value) => (value ? value : null)),
  firstName: trimmed(1, 60),
  phone: phoneSchema,
  email: requiredEmailSchema,
  consent: z
    .union([z.literal("on"), z.literal("true"), z.boolean()])
    .refine((v) => v === "on" || v === "true" || v === true, {
      message: "Vous devez accepter les conditions pour créer votre carte",
    }),
});

export const cardTokenSchema = z
  .string()
  .trim()
  .regex(/^[a-f0-9]{32}$/, "Carte invalide");

export const uuidSchema = z.string().uuid();

/** Montant d'un achat saisi au scan, en euros, converti en centimes. */
export const amountSchema = z
  .string()
  .trim()
  .min(1, "Montant requis")
  .transform((value) => value.replace(",", "."))
  .refine((value) => /^\d{1,6}(\.\d{1,2})?$/.test(value), "Montant invalide")
  .transform((value) => Math.round(Number(value) * 100))
  .refine((cents) => cents > 0, "Le montant doit être supérieur à zéro");

/** Formule d'abonnement choisie par le commerçant. */
export const planSchema = z.enum(["monthly", "yearly"]);

export const campaignSchema = z.object({
  name: trimmed(2, 80),
  /** Objet de l'email. Vide, l'envoi retombe sur le nom de la campagne. */
  subject: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  message: trimmed(5, 2000),
  channel: z.enum(["email", "push", "both"]).default("email"),
  audienceType: z.enum([
    "all",
    "inactive_30_days",
    "reward_available",
    "new_this_month",
    "best_customers",
  ]),
  imageUrl: z
    .string()
    .trim()
    .url()
    .max(500)
    .optional()
    .or(z.literal(""))
    .transform((value) => (value && value.length > 0 ? value : null)),
  /**
   * Date d'envoi souhaitée. Vide, la campagne part immédiatement. Une date
   * passée est refusée : elle partirait aussitôt sans que ce soit l'intention.
   */
  scheduledAt: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null))
    .refine(
      (value) => value === null || !Number.isNaN(new Date(value).getTime()),
      "Date d'envoi invalide.",
    ),
});

export type JoinInput = z.infer<typeof joinSchema>;
export type LoyaltyProgramInput = z.infer<typeof loyaltyProgramSchema>;
export type CampaignInput = z.infer<typeof campaignSchema>;
export type RewardTierInput = z.infer<typeof rewardTierSchema>;

/** Extrait le premier message d'erreur lisible d'un ZodError. */
export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Données invalides";
}

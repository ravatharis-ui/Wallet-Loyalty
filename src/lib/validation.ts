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
  rewardThreshold: z.coerce.number().int().min(1).max(1000),
  rewardName: trimmed(2, 80),
  rewardDescription: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  active: z.coerce.boolean().optional().default(true),
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
  message: trimmed(5, 2000),
  audienceType: z.enum(["all", "inactive_30_days", "reward_available"]),
});

export type JoinInput = z.infer<typeof joinSchema>;
export type LoyaltyProgramInput = z.infer<typeof loyaltyProgramSchema>;
export type CampaignInput = z.infer<typeof campaignSchema>;

/** Extrait le premier message d'erreur lisible d'un ZodError. */
export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Données invalides";
}

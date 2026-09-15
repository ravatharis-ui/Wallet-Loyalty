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

export const signupSchema = z.object({
  businessName: trimmed(2, 80),
  email: z.string().trim().email("Email invalide"),
  password: z.string().min(8, "Mot de passe : 8 caractères minimum").max(72),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis").max(72),
});

export const businessSchema = z.object({
  name: trimmed(2, 80),
  phone: z
    .union([phoneSchema, z.literal("")])
    .optional()
    .transform((v) => (v ? v : null)),
  email: optionalEmailSchema,
});

export const loyaltyProgramSchema = z.object({
  name: trimmed(2, 80),
  pointsPerVisit: z.coerce.number().int().min(1).max(100),
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

export const joinSchema = z.object({
  businessSlug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{1,50}$/, "Commerce introuvable"),
  firstName: trimmed(1, 60),
  phone: phoneSchema,
  email: optionalEmailSchema,
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

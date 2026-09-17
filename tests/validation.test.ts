import { describe, it, expect } from "vitest";
import {
  joinSchema,
  cardTokenSchema,
  loyaltyProgramSchema,
  campaignSchema,
  rewardTierSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  firstError,
} from "@/lib/validation";

describe("inscription client", () => {
  const valid = {
    businessSlug: "cafe-des-amis",
    firstName: "Thomas",
    phone: "06 12 34 56 78",
    email: "thomas@example.com",
    consent: "on",
  };

  it("accepte une inscription complète", () => {
    const result = joinSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("thomas@example.com");
  });

  it("refuse une inscription sans email", () => {
    // L'email est la condition des relances : le produit n'a pas d'intérêt sans lui.
    expect(joinSchema.safeParse({ ...valid, email: "" }).success).toBe(false);
    expect(joinSchema.safeParse({ ...valid, email: undefined }).success).toBe(false);
  });

  it("normalise l'email en minuscules", () => {
    const result = joinSchema.safeParse({ ...valid, email: "  Thomas@Example.COM " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("thomas@example.com");
  });

  it("refuse l'inscription sans consentement", () => {
    expect(joinSchema.safeParse({ ...valid, consent: false }).success).toBe(false);
  });

  it("refuse un téléphone invalide", () => {
    expect(joinSchema.safeParse({ ...valid, phone: "abc" }).success).toBe(false);
  });

  it("refuse un prénom vide", () => {
    expect(joinSchema.safeParse({ ...valid, firstName: "   " }).success).toBe(false);
  });

  it("refuse un slug de commerce malformé (tentative d'injection)", () => {
    expect(joinSchema.safeParse({ ...valid, businessSlug: "../../etc" }).success).toBe(false);
  });
});

describe("token de carte", () => {
  it("accepte 32 caractères hexadécimaux", () => {
    expect(cardTokenSchema.safeParse("a".repeat(32)).success).toBe(true);
  });

  it("refuse un identifiant court ou non hexadécimal", () => {
    expect(cardTokenSchema.safeParse("123").success).toBe(false);
    expect(cardTokenSchema.safeParse("z".repeat(32)).success).toBe(false);
    expect(cardTokenSchema.safeParse("1 OR 1=1").success).toBe(false);
  });
});

describe("programme de fidélité", () => {
  it("accepte une configuration classique", () => {
    const result = loyaltyProgramSchema.safeParse({
      name: "Ma fidélité",
      pointsPerVisit: "1",
      active: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pointsPerVisit).toBe(1);
      expect(result.data.mode).toBe("stamp");
    }
  });

  it("convertit le montant minimum de parrainage en centimes", () => {
    const result = loyaltyProgramSchema.safeParse({
      name: "Ma fidélité",
      mode: "amount",
      pointsPerVisit: "1",
      pointsPerEuro: "1",
      referralPoints: "50",
      referralMinAmount: "20,50",
      referralMonthlyLimit: "3",
      active: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.referralMinAmount).toBe(2050);
      expect(result.data.referralMonthlyLimit).toBe(3);
    }
  });

  it("traite un montant minimum vide ou invalide comme « pas de minimum »", () => {
    const base = {
      name: "Ma fidélité",
      pointsPerVisit: "1",
      active: true,
    };
    for (const value of ["", "   ", "abc", "-5"]) {
      const result = loyaltyProgramSchema.safeParse({ ...base, referralMinAmount: value });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.referralMinAmount).toBe(0);
    }
  });

  it("refuse un plafond mensuel négatif ou déraisonnable", () => {
    const base = {
      name: "Ma fidélité",
      pointsPerVisit: "1",
      active: true,
    };
    expect(loyaltyProgramSchema.safeParse({ ...base, referralMonthlyLimit: "-1" }).success).toBe(
      false,
    );
    expect(loyaltyProgramSchema.safeParse({ ...base, referralMonthlyLimit: "5000" }).success).toBe(
      false,
    );
  });

  it("refuse un barème nul ou négatif", () => {
    const base = { name: "Ma fidélité", active: true };
    expect(loyaltyProgramSchema.safeParse({ ...base, pointsPerVisit: "0" }).success).toBe(false);
    expect(loyaltyProgramSchema.safeParse({ ...base, pointsPerVisit: "-5" }).success).toBe(false);
  });
});

describe("palier de récompense", () => {
  it("accepte un palier nommé et chiffré", () => {
    const result = rewardTierSchema.safeParse({ name: "Un café offert", pointsCost: "10" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.pointsCost).toBe(10);
  });

  it("refuse un coût nul : un palier gratuit viderait le programme de son sens", () => {
    expect(rewardTierSchema.safeParse({ name: "Un café", pointsCost: "0" }).success).toBe(false);
    expect(rewardTierSchema.safeParse({ name: "Un café", pointsCost: "-3" }).success).toBe(false);
  });

  it("refuse un nom vide ou trop court", () => {
    expect(rewardTierSchema.safeParse({ name: " ", pointsCost: "10" }).success).toBe(false);
    expect(rewardTierSchema.safeParse({ name: "a", pointsCost: "10" }).success).toBe(false);
  });

  it("refuse un coût non numérique", () => {
    expect(rewardTierSchema.safeParse({ name: "Un café", pointsCost: "dix" }).success).toBe(false);
  });
});

describe("campagne", () => {
  it("refuse une audience inconnue", () => {
    expect(
      campaignSchema.safeParse({
        name: "Promo",
        message: "Bonjour à tous",
        audienceType: "tout_le_monde",
      }).success,
    ).toBe(false);
  });
});

describe("réinitialisation de mot de passe", () => {
  it("refuse une adresse invalide", () => {
    expect(forgotPasswordSchema.safeParse({ email: "pas-un-email" }).success).toBe(false);
  });

  it("accepte deux mots de passe identiques d'au moins 8 caractères", () => {
    expect(
      resetPasswordSchema.safeParse({ password: "motdepasse1", confirmation: "motdepasse1" })
        .success,
    ).toBe(true);
  });

  it("refuse une confirmation différente", () => {
    const result = resetPasswordSchema.safeParse({
      password: "motdepasse1",
      confirmation: "motdepasse2",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(firstError(result.error)).toContain("ne correspondent pas");
    }
  });

  it("refuse un mot de passe trop court", () => {
    expect(
      resetPasswordSchema.safeParse({ password: "court", confirmation: "court" }).success,
    ).toBe(false);
  });
});

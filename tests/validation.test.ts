import { describe, it, expect } from "vitest";
import {
  joinSchema,
  cardTokenSchema,
  loyaltyProgramSchema,
  campaignSchema,
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

  it("accepte une inscription sans email", () => {
    const result = joinSchema.safeParse({ ...valid, email: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBeNull();
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
      rewardThreshold: "10",
      rewardName: "1 café offert",
      rewardDescription: "",
      active: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rewardThreshold).toBe(10);
      expect(result.data.rewardDescription).toBeNull();
    }
  });

  it("refuse un seuil nul ou négatif", () => {
    const base = {
      name: "Ma fidélité",
      pointsPerVisit: "1",
      rewardName: "1 café offert",
      active: true,
    };
    expect(loyaltyProgramSchema.safeParse({ ...base, rewardThreshold: "0" }).success).toBe(false);
    expect(loyaltyProgramSchema.safeParse({ ...base, rewardThreshold: "-5" }).success).toBe(false);
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

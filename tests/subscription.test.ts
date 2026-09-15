import { describe, it, expect } from "vitest";
import { hasActiveSubscription, trialPeriodEnd } from "@/lib/loyalty";

const now = new Date("2026-03-01T12:00:00Z");
const future = "2026-04-01T12:00:00Z";
const past = "2026-02-01T12:00:00Z";

describe("accès conditionné à l'abonnement", () => {
  it("donne accès pendant l'essai", () => {
    expect(hasActiveSubscription({ status: "trialing", current_period_end: future }, now)).toBe(
      true,
    );
  });

  it("donne accès avec un abonnement actif", () => {
    expect(hasActiveSubscription({ status: "active", current_period_end: future }, now)).toBe(true);
  });

  it("refuse l'accès sans abonnement", () => {
    expect(hasActiveSubscription(null, now)).toBe(false);
    expect(hasActiveSubscription({ status: "none", current_period_end: null }, now)).toBe(false);
  });

  it("refuse l'accès en cas d'impayé ou de résiliation", () => {
    for (const status of ["past_due", "unpaid", "canceled", "incomplete", "paused"] as const) {
      expect(hasActiveSubscription({ status, current_period_end: future }, now)).toBe(false);
    }
  });

  it("refuse l'accès si la période est terminée", () => {
    expect(hasActiveSubscription({ status: "active", current_period_end: past }, now)).toBe(false);
  });

  it("accepte un abonnement actif sans date de fin connue", () => {
    expect(hasActiveSubscription({ status: "active", current_period_end: null }, now)).toBe(true);
  });
});

describe("essai gratuit à l'inscription", () => {
  const now = new Date("2026-03-01T12:00:00Z");

  it("ouvre 14 jours par défaut", () => {
    expect(trialPeriodEnd(undefined, now)).toBe("2026-03-15T12:00:00.000Z");
  });

  it("respecte une durée configurée", () => {
    expect(trialPeriodEnd(30, now)).toBe("2026-03-31T12:00:00.000Z");
  });

  it("retombe sur 14 jours si la configuration est invalide", () => {
    expect(trialPeriodEnd(Number.NaN, now)).toBe("2026-03-15T12:00:00.000Z");
    expect(trialPeriodEnd(-5, now)).toBe("2026-03-15T12:00:00.000Z");
  });

  it("donne bien accès au produit pendant l'essai", () => {
    expect(
      hasActiveSubscription(
        { status: "trialing", current_period_end: trialPeriodEnd(14, now) },
        now,
      ),
    ).toBe(true);
  });

  it("coupe l'accès une fois l'essai expiré", () => {
    const expired = trialPeriodEnd(14, new Date("2026-01-01T12:00:00Z"));
    expect(hasActiveSubscription({ status: "trialing", current_period_end: expired }, now)).toBe(
      false,
    );
  });
});

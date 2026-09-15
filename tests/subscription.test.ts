import { describe, it, expect } from "vitest";
import { hasActiveSubscription } from "@/lib/loyalty";

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

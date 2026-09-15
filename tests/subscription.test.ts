import { describe, it, expect } from "vitest";
import { hasActiveSubscription, trialPeriodEnd, subscriptionAccess } from "@/lib/loyalty";

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

describe("période de grâce après expiration", () => {
  const now = new Date("2026-03-01T12:00:00Z");
  const daysFromNow = (days: number) => new Date(now.getTime() + days * 86_400_000).toISOString();

  it("accès complet tant que l'abonnement est actif", () => {
    const access = subscriptionAccess(
      { status: "active", current_period_end: daysFromNow(10) },
      now,
    );
    expect(access.level).toBe("active");
    expect(access.graceDaysLeft).toBeNull();
  });

  it("laisse 7 jours de grâce après la fin de l'essai", () => {
    const access = subscriptionAccess(
      { status: "trialing", current_period_end: daysFromNow(-1) },
      now,
    );
    expect(access.level).toBe("grace");
    expect(access.graceDaysLeft).toBe(6);
  });

  it("décompte les jours restants au fil de la grâce", () => {
    expect(
      subscriptionAccess({ status: "trialing", current_period_end: daysFromNow(-6) }, now)
        .graceDaysLeft,
    ).toBe(1);
  });

  it("bloque les visites une fois la grâce écoulée", () => {
    expect(
      subscriptionAccess({ status: "trialing", current_period_end: daysFromNow(-8) }, now).level,
    ).toBe("blocked");
  });

  it("accorde la grâce en cas d'impayé, pas un blocage immédiat", () => {
    // Une carte expirée ne doit jamais couper le comptoir le jour même.
    expect(
      subscriptionAccess({ status: "past_due", current_period_end: daysFromNow(-2) }, now).level,
    ).toBe("grace");
  });

  it("laisse travailler jusqu'à la fin de la période après une résiliation", () => {
    expect(
      subscriptionAccess({ status: "canceled", current_period_end: daysFromNow(5) }, now).level,
    ).toBe("grace");
  });

  it("bloque un commerce qui n'a jamais eu d'abonnement", () => {
    expect(subscriptionAccess(null, now).level).toBe("blocked");
    expect(subscriptionAccess({ status: "none", current_period_end: null }, now).level).toBe(
      "blocked",
    );
  });

  it("l'envoi d'emails s'arrête dès l'expiration, même pendant la grâce", () => {
    const expired = { status: "trialing" as const, current_period_end: daysFromNow(-1) };
    expect(subscriptionAccess(expired, now).level).toBe("grace");
    expect(hasActiveSubscription(expired, now)).toBe(false);
  });
});

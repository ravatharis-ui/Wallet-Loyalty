import { describe, it, expect } from "vitest";
import {
  hasActiveSubscription,
  subscriptionAccess,
  canCreateCustomer,
  canSendEmails,
  FREE_TIER_CUSTOMER_LIMIT,
} from "@/lib/loyalty";

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

  it("place un commerce jamais abonné en mode découverte", () => {
    expect(subscriptionAccess(null, now).level).toBe("free");
    expect(subscriptionAccess({ status: "none", current_period_end: null }, now).level).toBe(
      "free",
    );
  });

  it("l'envoi d'emails s'arrête dès l'expiration, même pendant la grâce", () => {
    const expired = { status: "trialing" as const, current_period_end: daysFromNow(-1) };
    expect(subscriptionAccess(expired, now).level).toBe("grace");
    expect(hasActiveSubscription(expired, now)).toBe(false);
  });
});

describe("palier gratuit — 3 cartes clients", () => {
  const now = new Date("2026-03-01T12:00:00Z");
  const free = subscriptionAccess(null, now);
  const active = subscriptionAccess(
    { status: "active", current_period_end: "2026-04-01T12:00:00Z" },
    now,
  );

  it("annonce la limite en mode découverte", () => {
    expect(free.level).toBe("free");
    expect(free.customerLimit).toBe(FREE_TIER_CUSTOMER_LIMIT);
  });

  it("laisse créer jusqu'à la limite, puis refuse", () => {
    expect(canCreateCustomer(free, 0)).toBe(true);
    expect(canCreateCustomer(free, 2)).toBe(true);
    expect(canCreateCustomer(free, 3)).toBe(false);
    expect(canCreateCustomer(free, 10)).toBe(false);
  });

  it("lève la limite avec un abonnement en cours", () => {
    expect(active.customerLimit).toBeNull();
    expect(canCreateCustomer(active, 5_000)).toBe(true);
  });

  it("refuse toute création une fois la grâce écoulée", () => {
    const blocked = subscriptionAccess(
      { status: "canceled", current_period_end: "2026-01-01T12:00:00Z" },
      now,
    );
    expect(blocked.level).toBe("blocked");
    expect(canCreateCustomer(blocked, 0)).toBe(false);
  });

  it("autorise les emails en découverte et sur abonnement, pas après expiration", () => {
    expect(canSendEmails(free)).toBe(true);
    expect(canSendEmails(active)).toBe(true);

    const grace = subscriptionAccess(
      { status: "past_due", current_period_end: "2026-02-27T12:00:00Z" },
      now,
    );
    expect(grace.level).toBe("grace");
    expect(canSendEmails(grace)).toBe(false);
  });
});

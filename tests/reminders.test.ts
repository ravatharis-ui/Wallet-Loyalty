import { describe, it, expect } from "vitest";
import { shouldSendInactivityReminder } from "@/lib/loyalty";

const now = new Date("2026-03-01T12:00:00Z");
const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString();

describe("relance d'inactivité", () => {
  it("part à 30 jours si le client a un email", () => {
    expect(
      shouldSendInactivityReminder(
        { lastVisitAt: daysAgo(31), email: "client@example.com", sentMessages: [] },
        "inactive_30_days",
        now,
      ),
    ).toBe(true);
  });

  it("ne part pas sans email", () => {
    expect(
      shouldSendInactivityReminder(
        { lastVisitAt: daysAgo(31), email: null, sentMessages: [] },
        "inactive_30_days",
        now,
      ),
    ).toBe(false);
  });

  it("ne part pas avant le seuil", () => {
    expect(
      shouldSendInactivityReminder(
        { lastVisitAt: daysAgo(20), email: "client@example.com", sentMessages: [] },
        "inactive_30_days",
        now,
      ),
    ).toBe(false);
  });

  it("n'envoie jamais deux fois la même relance", () => {
    expect(
      shouldSendInactivityReminder(
        {
          lastVisitAt: daysAgo(35),
          email: "client@example.com",
          sentMessages: [{ type: "inactive_30_days", created_at: daysAgo(4) }],
        },
        "inactive_30_days",
        now,
      ),
    ).toBe(false);
  });

  it("réarme la relance après le retour du client", () => {
    expect(
      shouldSendInactivityReminder(
        {
          // Relance envoyée il y a 100 jours, le client est revenu il y a 31 jours.
          lastVisitAt: daysAgo(31),
          email: "client@example.com",
          sentMessages: [{ type: "inactive_30_days", created_at: daysAgo(100) }],
        },
        "inactive_30_days",
        now,
      ),
    ).toBe(true);
  });

  it("bascule sur la relance 60 jours et n'envoie plus celle de 30 jours", () => {
    const candidate = {
      lastVisitAt: daysAgo(61),
      email: "client@example.com",
      sentMessages: [{ type: "inactive_30_days" as const, created_at: daysAgo(30) }],
    };
    expect(shouldSendInactivityReminder(candidate, "inactive_60_days", now)).toBe(true);
    expect(shouldSendInactivityReminder(candidate, "inactive_30_days", now)).toBe(false);
  });

  it("n'envoie pas la relance 60 jours deux fois", () => {
    expect(
      shouldSendInactivityReminder(
        {
          lastVisitAt: daysAgo(70),
          email: "client@example.com",
          sentMessages: [{ type: "inactive_60_days", created_at: daysAgo(8) }],
        },
        "inactive_60_days",
        now,
      ),
    ).toBe(false);
  });

  it("abandonne au-delà de 180 jours", () => {
    expect(
      shouldSendInactivityReminder(
        { lastVisitAt: daysAgo(200), email: "client@example.com", sentMessages: [] },
        "inactive_60_days",
        now,
      ),
    ).toBe(false);
  });
});

describe("rattrapage après un échec d'envoi", () => {
  /**
   * Un envoi qui a échoué (Resend non configuré, domaine non vérifié, panne)
   * ne doit pas être comptabilisé comme une relance faite. L'appelant ne
   * transmet donc que les messages au statut « sent » — ces tests décrivent le
   * comportement attendu une fois ce filtrage appliqué.
   */
  it("renvoie la relance si la précédente tentative a échoué", () => {
    expect(
      shouldSendInactivityReminder(
        {
          lastVisitAt: daysAgo(35),
          email: "client@example.com",
          // Aucune relance réussie : l'échec n'apparaît pas dans la liste.
          sentMessages: [],
        },
        "inactive_30_days",
        now,
      ),
    ).toBe(true);
  });

  it("ne relance plus une fois qu'un envoi a réussi", () => {
    expect(
      shouldSendInactivityReminder(
        {
          lastVisitAt: daysAgo(35),
          email: "client@example.com",
          sentMessages: [{ type: "inactive_30_days", created_at: daysAgo(2) }],
        },
        "inactive_30_days",
        now,
      ),
    ).toBe(false);
  });
});

/**
 * La notification « vous pouvez échanger » ne passe plus par une fonction pure :
 * elle s'appuie sur `customers.reward_notified_at`, remis à zéro par la
 * fonction SQL `redeem_reward`. Son comportement est couvert par la suite
 * d'intégration, qui seule peut observer la base.
 */

import { describe, it, expect } from "vitest";
import {
  applyVisit,
  visitsUntilReward,
  progressLabel,
  slugify,
  daysSince,
  isInactive,
} from "@/lib/loyalty";

const cafeRules = { points_per_visit: 1, reward_threshold: 10 };

describe("applyVisit — calcul des points", () => {
  it("ajoute les points configurés et incrémente le total de visites", () => {
    const result = applyVisit({ current_points: 3, total_visits: 3 }, cafeRules);
    expect(result.current_points).toBe(4);
    expect(result.total_visits).toBe(4);
    expect(result.points_added).toBe(1);
    expect(result.rewards_earned).toBe(0);
  });

  it("ne crée pas de récompense avant le seuil", () => {
    const result = applyVisit({ current_points: 8, total_visits: 8 }, cafeRules);
    expect(result.rewards_earned).toBe(0);
    expect(result.current_points).toBe(9);
  });

  it("crée une récompense à la 10e visite et remet le compteur à zéro", () => {
    const result = applyVisit({ current_points: 9, total_visits: 9 }, cafeRules);
    expect(result.rewards_earned).toBe(1);
    expect(result.current_points).toBe(0);
    expect(result.total_visits).toBe(10);
  });

  it("enchaîne 10 visites depuis zéro et donne exactement une récompense", () => {
    let state = { current_points: 0, total_visits: 0 };
    let rewards = 0;
    for (let i = 0; i < 10; i++) {
      const result = applyVisit(state, cafeRules);
      rewards += result.rewards_earned;
      state = { current_points: result.current_points, total_visits: result.total_visits };
    }
    expect(rewards).toBe(1);
    expect(state.total_visits).toBe(10);
    expect(state.current_points).toBe(0);
  });

  it("gère un programme qui donne plus de points que le seuil", () => {
    const result = applyVisit(
      { current_points: 0, total_visits: 0 },
      {
        points_per_visit: 25,
        reward_threshold: 10,
      },
    );
    expect(result.rewards_earned).toBe(2);
    expect(result.current_points).toBe(5);
  });

  it("ignore des règles incohérentes plutôt que de boucler à l'infini", () => {
    const result = applyVisit(
      { current_points: 0, total_visits: 0 },
      {
        points_per_visit: 0,
        reward_threshold: 0,
      },
    );
    expect(result.points_added).toBe(1);
    expect(result.rewards_earned).toBe(1);
  });
});

describe("progression affichée au client", () => {
  it("compte les visites restantes", () => {
    expect(visitsUntilReward(7, cafeRules)).toBe(3);
    expect(visitsUntilReward(10, cafeRules)).toBe(0);
  });

  it("tient compte des points par visite", () => {
    expect(visitsUntilReward(0, { points_per_visit: 2, reward_threshold: 10 })).toBe(5);
    expect(visitsUntilReward(1, { points_per_visit: 2, reward_threshold: 10 })).toBe(5);
  });

  it("formule le message en français", () => {
    expect(progressLabel(7, cafeRules)).toBe("Plus que 3 visites !");
    expect(progressLabel(9, cafeRules)).toBe("Plus qu'une visite !");
    expect(progressLabel(10, cafeRules)).toBe("Récompense disponible !");
  });
});

describe("inactivité", () => {
  const now = new Date("2026-03-01T12:00:00Z");

  it("calcule les jours écoulés", () => {
    expect(daysSince("2026-02-01T12:00:00Z", now)).toBe(28);
    expect(daysSince(null, now)).toBeNull();
  });

  it("détecte un client inactif au-delà de 30 jours", () => {
    expect(isInactive("2026-01-15T12:00:00Z", 30, now)).toBe(true);
    expect(isInactive("2026-02-20T12:00:00Z", 30, now)).toBe(false);
  });

  it("ne considère pas comme inactif un client qui n'est jamais venu", () => {
    expect(isInactive(null, 30, now)).toBe(false);
  });
});

describe("slugify", () => {
  it("produit un slug d'URL propre", () => {
    expect(slugify("Café des Amis")).toBe("cafe-des-amis");
    expect(slugify("  Boulangerie   Élise !! ")).toBe("boulangerie-elise");
    expect(slugify("---")).toBe("");
  });
});

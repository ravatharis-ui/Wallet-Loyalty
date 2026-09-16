import { describe, it, expect } from "vitest";
import {
  applyVisit,
  visitsUntilReward,
  progressLabel,
  slugify,
  daysSince,
  isInactive,
  pointsForVisit,
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

describe("mode « points selon le montant »", () => {
  const rules = {
    mode: "amount" as const,
    points_per_visit: 1,
    points_per_euro: 1,
    reward_threshold: 500,
  };

  it("convertit le montant en points, un point par euro", () => {
    expect(pointsForVisit(rules, 4500)).toBe(45);
  });

  it("ignore les centimes", () => {
    // Un barème au centime serait illisible pour le client comme pour le commerçant.
    expect(pointsForVisit(rules, 4599)).toBe(45);
    expect(pointsForVisit(rules, 99)).toBe(0);
  });

  it("applique le barème choisi", () => {
    expect(pointsForVisit({ ...rules, points_per_euro: 10 }, 4500)).toBe(450);
  });

  it("ne rapporte rien sans montant", () => {
    expect(pointsForVisit(rules, null)).toBe(0);
    expect(pointsForVisit(rules, 0)).toBe(0);
  });

  it("déclenche la récompense au seuil de points", () => {
    const result = applyVisit({ current_points: 470, total_visits: 9 }, rules, 4500);
    expect(result.points_added).toBe(45);
    expect(result.rewards_earned).toBe(1);
    expect(result.current_points).toBe(15);
  });

  it("annonce les points restants, pas des visites", () => {
    expect(progressLabel(320, rules)).toBe("Plus que 180 points !");
    expect(progressLabel(499, rules)).toBe("Plus qu'un point !");
    expect(progressLabel(500, rules)).toBe("Récompense disponible !");
  });

  it("ne change rien au mode tampon", () => {
    const stamp = { points_per_visit: 1, reward_threshold: 10 };
    expect(pointsForVisit(stamp, 9999)).toBe(1);
    expect(progressLabel(7, stamp)).toBe("Plus que 3 visites !");
  });
});

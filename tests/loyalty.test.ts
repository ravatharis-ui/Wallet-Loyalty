import { describe, it, expect } from "vitest";
import {
  applyVisit,
  visitsUntilReward,
  progressLabel,
  affordableTiers,
  nextTier,
  bestAffordableTier,
  slugify,
  daysSince,
  isInactive,
  pointsForVisit,
} from "@/lib/loyalty";

const cafeRules = { points_per_visit: 1 };

/** Catalogue de référence : une petite marche, une moyenne, une ambitieuse. */
const tiers = [
  { id: "cafe", name: "Un café offert", points_cost: 10 },
  { id: "dessert", name: "Un dessert", points_cost: 25 },
  { id: "menu", name: "Un menu complet", points_cost: 60 },
];

describe("applyVisit — calcul des points", () => {
  it("ajoute les points configurés et incrémente le total de visites", () => {
    const result = applyVisit({ current_points: 3, total_visits: 3 }, cafeRules);
    expect(result.current_points).toBe(4);
    expect(result.total_visits).toBe(4);
    expect(result.points_added).toBe(1);
  });

  it("n'entame jamais le solde : les points ne se consomment qu'à l'échange", () => {
    // C'est toute la différence avec l'ancien modèle à seuil unique, où le
    // compteur repartait de zéro sans que le client ait rien choisi.
    let state = { current_points: 0, total_visits: 0 };
    for (let i = 0; i < 30; i++) {
      const result = applyVisit(state, cafeRules);
      state = { current_points: result.current_points, total_visits: result.total_visits };
    }
    expect(state.current_points).toBe(30);
    expect(state.total_visits).toBe(30);
  });

  it("applique le barème au montant en mode points", () => {
    const result = applyVisit(
      { current_points: 0, total_visits: 0 },
      { mode: "amount", points_per_visit: 1, points_per_euro: 2 },
      4550,
    );
    // 45 € entiers × 2 points : les centimes ne rapportent rien.
    expect(result.points_added).toBe(90);
  });

  it("ignore un barème incohérent plutôt que de rendre zéro point", () => {
    const result = applyVisit({ current_points: 0, total_visits: 0 }, { points_per_visit: 0 });
    expect(result.points_added).toBe(1);
  });
});

describe("catalogue de récompenses", () => {
  it("liste ce que le solde permet, du moins cher au plus cher", () => {
    expect(affordableTiers(30, tiers).map((tier) => tier.id)).toEqual(["cafe", "dessert"]);
    expect(affordableTiers(5, tiers)).toEqual([]);
  });

  it("met en avant la meilleure récompense accessible", () => {
    expect(bestAffordableTier(30, tiers)?.id).toBe("dessert");
    expect(bestAffordableTier(60, tiers)?.id).toBe("menu");
    expect(bestAffordableTier(0, tiers)).toBeNull();
  });

  it("désigne le prochain palier hors de portée", () => {
    expect(nextTier(0, tiers)?.id).toBe("cafe");
    expect(nextTier(10, tiers)?.id).toBe("dessert");
    // Catalogue épuisé : il n'y a plus rien à viser.
    expect(nextTier(100, tiers)).toBeNull();
  });

  it("ne se fie pas à l'ordre de la liste fournie", () => {
    const shuffled = [tiers[2], tiers[0], tiers[1]];
    expect(nextTier(0, shuffled)?.id).toBe("cafe");
    expect(bestAffordableTier(30, shuffled)?.id).toBe("dessert");
  });
});

describe("progression affichée au client", () => {
  it("compte les visites restantes avant un palier", () => {
    expect(visitsUntilReward(7, cafeRules, 10)).toBe(3);
    expect(visitsUntilReward(10, cafeRules, 10)).toBe(0);
  });

  it("tient compte des points gagnés par visite", () => {
    expect(visitsUntilReward(0, { points_per_visit: 2 }, 10)).toBe(5);
    expect(visitsUntilReward(1, { points_per_visit: 2 }, 10)).toBe(5);
  });

  it("annonce ce qui manque, en nommant la récompense visée", () => {
    expect(progressLabel(7, cafeRules, tiers)).toBe("Plus que 3 visites avant Un café offert");
    expect(progressLabel(9, cafeRules, tiers)).toBe("Plus qu'une visite avant Un café offert");
  });

  it("annonce la meilleure récompense dès qu'elle est à portée", () => {
    expect(progressLabel(10, cafeRules, tiers)).toBe("Vous pouvez échanger : Un café offert");
    expect(progressLabel(30, cafeRules, tiers)).toBe("Vous pouvez échanger : Un dessert");
  });

  it("compte en points, pas en visites, en mode montant", () => {
    // Tant qu'aucun palier n'est atteint, c'est le manque qui s'affiche.
    const rules = { mode: "amount" as const, points_per_visit: 1, points_per_euro: 1 };
    expect(progressLabel(9, rules, tiers)).toBe("Plus qu'un point avant Un café offert");
    expect(progressLabel(4, rules, tiers)).toBe("Plus que 6 points avant Un café offert");
  });

  it("annonce ce qui est acquis plutôt que ce qui manque, dès le premier palier", () => {
    // À 24 points le café est déjà gagné : lui parler du dessert le frustrerait
    // au lieu de l'inviter à passer au comptoir.
    const rules = { mode: "amount" as const, points_per_visit: 1, points_per_euro: 1 };
    expect(progressLabel(24, rules, tiers)).toBe("Vous pouvez échanger : Un café offert");
  });

  it("reste lisible quand le commerce n'a encore rien mis au catalogue", () => {
    expect(progressLabel(12, cafeRules, [])).toBe("Cumulez des points à chaque passage.");
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

  it("cumule les points sans les consommer", () => {
    const result = applyVisit({ current_points: 470, total_visits: 9 }, rules, 4500);
    expect(result.points_added).toBe(45);
    expect(result.current_points).toBe(515);
  });

  it("annonce les points restants, pas des visites", () => {
    const catalogue = [{ id: "offre", name: "Un bon d'achat", points_cost: 500 }];
    expect(progressLabel(320, rules, catalogue)).toBe("Plus que 180 points avant Un bon d'achat");
    expect(progressLabel(499, rules, catalogue)).toBe("Plus qu'un point avant Un bon d'achat");
    expect(progressLabel(500, rules, catalogue)).toBe("Vous pouvez échanger : Un bon d'achat");
  });

  it("ne change rien au mode tampon", () => {
    const stamp = { points_per_visit: 1 };
    expect(pointsForVisit(stamp, 9999)).toBe(1);
    expect(progressLabel(7, stamp, tiers)).toBe("Plus que 3 visites avant Un café offert");
  });
});

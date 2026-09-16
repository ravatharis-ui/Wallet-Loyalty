import { describe, it, expect } from "vitest";
import { bucketVisitsByMonth, historyStart, growthPercent } from "@/lib/visits-history";

const now = new Date("2026-09-16T12:00:00Z");

describe("historique des visites par mois", () => {
  it("couvre six mois, mois courant inclus", () => {
    const points = bucketVisitsByMonth([], now);
    expect(points).toHaveLength(6);
    expect(points[0].label).toBe("avril");
    expect(points[5].label).toBe("septembre");
  });

  it("compte les visites dans le bon mois", () => {
    const points = bucketVisitsByMonth(
      [
        "2026-09-01T10:00:00Z",
        "2026-09-15T10:00:00Z",
        "2026-08-20T10:00:00Z",
        "2026-04-02T10:00:00Z",
      ],
      now,
    );
    expect(points[5].visits).toBe(2);
    expect(points[4].visits).toBe(1);
    expect(points[0].visits).toBe(1);
  });

  it("conserve les mois sans visite à zéro", () => {
    // Un mois manquant se lirait comme une baisse d'activité, pas comme un trou.
    const points = bucketVisitsByMonth(["2026-09-01T10:00:00Z"], now);
    expect(points.map((point) => point.visits)).toEqual([0, 0, 0, 0, 0, 1]);
  });

  it("ignore les dates hors fenêtre ou invalides", () => {
    const points = bucketVisitsByMonth(
      ["2025-01-01T10:00:00Z", "pas-une-date", "2026-09-01T10:00:00Z"],
      now,
    );
    expect(points.reduce((total, point) => total + point.visits, 0)).toBe(1);
  });

  it("démarre la fenêtre au premier jour du sixième mois", () => {
    expect(historyStart(now)).toBe(new Date(2026, 3, 1).toISOString());
  });
});

describe("libellés des mois", () => {
  it("abrège le mois avec une majuscule, et le nomme en entier au survol", () => {
    const points = bucketVisitsByMonth([], now);
    expect(points.map((point) => point.month)).toEqual([
      "Avr",
      "Mai",
      "Juin",
      "Juil",
      "Août",
      "Sept",
    ]);
    expect(points[5].label).toBe("septembre");
  });
});

describe("progression sur six mois", () => {
  const point = (month: string, visits: number) => ({ month, label: month, visits });

  it("compare le dernier mois au premier", () => {
    expect(growthPercent([point("Avr", 62), point("Sept", 138)])).toBe(123);
  });

  it("gère une baisse", () => {
    expect(growthPercent([point("Avr", 100), point("Sept", 60)])).toBe(-40);
  });

  it("ne compare rien depuis zéro", () => {
    // Un commerce qui démarre à zéro n'a pas fait « +∞ % ».
    expect(growthPercent([point("Avr", 0), point("Sept", 40)])).toBeNull();
  });

  it("ne compare rien sur un historique trop court", () => {
    expect(growthPercent([])).toBeNull();
    expect(growthPercent([point("Sept", 40)])).toBeNull();
  });
});

import { describe, it, expect } from "vitest";
import { basketToCents, loyalRevenueCents, formatCents } from "@/lib/revenue";

describe("panier moyen", () => {
  it("accepte les deux séparateurs décimaux", () => {
    expect(basketToCents("6,50")).toBe(650);
    expect(basketToCents("6.50")).toBe(650);
    expect(basketToCents(28)).toBe(2800);
  });

  it("refuse une valeur absurde ou vide", () => {
    expect(basketToCents("")).toBeNull();
    expect(basketToCents(null)).toBeNull();
    expect(basketToCents("0")).toBeNull();
    expect(basketToCents("-5")).toBeNull();
    expect(basketToCents("abc")).toBeNull();
    expect(basketToCents("999999")).toBeNull();
  });

  it("arrondit au centime", () => {
    expect(basketToCents("6,499")).toBe(650);
  });
});

describe("chiffre d'affaires des clients fidèles", () => {
  it("multiplie les visites par le panier moyen", () => {
    expect(loyalRevenueCents(138, 2800)).toBe(386_400);
    expect(formatCents(386_400)).toContain("3");
  });

  it("n'affiche rien tant que le panier moyen n'est pas renseigné", () => {
    // Mieux vaut ne rien montrer qu'un chiffre inventé.
    expect(loyalRevenueCents(138, null)).toBeNull();
    expect(loyalRevenueCents(138, 0)).toBeNull();
  });

  it("vaut zéro sans visite", () => {
    expect(loyalRevenueCents(0, 2800)).toBe(0);
  });
});

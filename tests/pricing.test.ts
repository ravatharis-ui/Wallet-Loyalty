import { describe, it, expect } from "vitest";
import {
  PRICE_MONTHLY_EUR,
  PRICE_YEARLY_EUR,
  PRICE_LABEL,
  PRICE_YEARLY_LABEL,
  PRICE_YEARLY_PER_MONTH_LABEL,
  YEARLY_SAVING_EUR,
  YEARLY_FREE_MONTHS,
} from "@/lib/pricing";

/**
 * Ces montants sont affichés aux commerçants et repris dans les CGU : une
 * incohérence entre le prix annoncé et le prix prélevé est un motif de litige.
 */
describe("tarification", () => {
  it("l'annuel est moins cher que douze mensualités", () => {
    expect(PRICE_YEARLY_EUR).toBeLessThan(PRICE_MONTHLY_EUR * 12);
  });

  it("annonce une économie exacte", () => {
    expect(YEARLY_SAVING_EUR).toBeCloseTo(PRICE_MONTHLY_EUR * 12 - PRICE_YEARLY_EUR, 2);
    expect(YEARLY_SAVING_EUR).toBeCloseTo(118.8, 2);
  });

  it("annonce un nombre de mois offerts cohérent avec l'économie", () => {
    expect(YEARLY_FREE_MONTHS).toBe(2);
  });

  it("formate les montants en euros français", () => {
    expect(PRICE_LABEL).toContain("49,90");
    expect(PRICE_YEARLY_LABEL).toContain("480");
    expect(PRICE_YEARLY_PER_MONTH_LABEL).toContain("40,00");
  });

  it("l'équivalent mensuel de l'annuel reste sous le tarif mensuel", () => {
    expect(PRICE_YEARLY_EUR / 12).toBeLessThan(PRICE_MONTHLY_EUR);
  });
});

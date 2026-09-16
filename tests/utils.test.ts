import { describe, it, expect } from "vitest";
import { formatEuros } from "@/lib/utils";

describe("formatEuros", () => {
  it("n'affiche pas de décimales pour un montant rond", () => {
    expect(formatEuros(2000)).toBe("20 €");
    expect(formatEuros(0)).toBe("0 €");
  });

  it("affiche les centimes quand il y en a", () => {
    expect(formatEuros(2050)).toBe("20,50 €");
    expect(formatEuros(999)).toBe("9,99 €");
  });
});

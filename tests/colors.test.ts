import { describe, it, expect } from "vitest";
import {
  safeCardColor,
  isValidHexColor,
  readableTextColor,
  relativeLuminance,
  DEFAULT_CARD_COLOR,
  CARD_COLOR_PRESETS,
} from "@/lib/colors";

describe("couleur de carte", () => {
  it("accepte une couleur hexadécimale sur six caractères", () => {
    expect(isValidHexColor("#4f46e5")).toBe(true);
    expect(isValidHexColor("#FFF")).toBe(false);
    expect(isValidHexColor("rouge")).toBe(false);
    expect(isValidHexColor("#4f46e5; background:url(x)")).toBe(false);
  });

  it("retombe sur la couleur par défaut si la valeur est invalide", () => {
    // La couleur est injectée dans un attribut style : une valeur non validée
    // permettrait d'injecter du CSS arbitraire.
    expect(safeCardColor(null)).toBe(DEFAULT_CARD_COLOR);
    expect(safeCardColor("")).toBe(DEFAULT_CARD_COLOR);
    expect(safeCardColor("javascript:alert(1)")).toBe(DEFAULT_CARD_COLOR);
    expect(safeCardColor("#4F46E5")).toBe("#4f46e5");
  });

  it("choisit un texte lisible sur fond sombre comme sur fond clair", () => {
    expect(readableTextColor("#111827")).toBe("#ffffff");
    expect(readableTextColor("#000000")).toBe("#ffffff");
    expect(readableTextColor("#ffffff")).toBe("#111827");
    expect(readableTextColor("#fde047")).toBe("#111827");
  });

  it("garde un texte lisible sur toutes les couleurs proposées", () => {
    for (const preset of CARD_COLOR_PRESETS) {
      const text = readableTextColor(preset.value);
      const contrast =
        (Math.max(relativeLuminance(preset.value), relativeLuminance(text)) + 0.05) /
        (Math.min(relativeLuminance(preset.value), relativeLuminance(text)) + 0.05);
      // Seuil WCAG AA pour du texte de grande taille.
      expect(contrast).toBeGreaterThan(3);
    }
  });
});

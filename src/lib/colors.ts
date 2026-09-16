/**
 * Utilitaires de couleur pour la carte personnalisée.
 * Fonctions pures, sans dépendance : testables et utilisables des deux côtés.
 */

/** Couleur par défaut si le commerce n'a rien choisi. */
export const DEFAULT_CARD_COLOR = "#111827";

/** Palette proposée au commerçant — volontairement courte. */
export const CARD_COLOR_PRESETS = [
  { value: "#111827", label: "Noir" },
  { value: "#4f46e5", label: "Indigo" },
  { value: "#0f766e", label: "Émeraude" },
  { value: "#b45309", label: "Ambre" },
  { value: "#be123c", label: "Rouge" },
  { value: "#1d4ed8", label: "Bleu" },
] as const;

const HEX = /^#[0-9a-fA-F]{6}$/;

export function isValidHexColor(value: string): boolean {
  return HEX.test(value.trim());
}

/** Normalise une couleur, ou retourne la couleur par défaut si elle est invalide. */
export function safeCardColor(value: string | null | undefined): string {
  if (!value) return DEFAULT_CARD_COLOR;
  const trimmed = value.trim().toLowerCase();
  return HEX.test(trimmed) ? trimmed : DEFAULT_CARD_COLOR;
}

/**
 * Luminance relative (WCAG), entre 0 (noir) et 1 (blanc).
 * Sert à choisir une couleur de texte lisible sur n'importe quel fond.
 */
export function relativeLuminance(hex: string): number {
  const color = safeCardColor(hex);
  const channels = [1, 3, 5].map((index) => {
    const value = parseInt(color.slice(index, index + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/**
 * Texte noir ou blanc selon le fond, pour rester lisible quelle que soit la
 * couleur choisie par le commerçant.
 */
export function readableTextColor(background: string): "#ffffff" | "#111827" {
  return relativeLuminance(background) > 0.45 ? "#111827" : "#ffffff";
}

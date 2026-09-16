/**
 * Chiffrage de l'activité des clients fidèles.
 * Fonctions pures : le calcul affiché au commerçant doit être vérifiable.
 */

const euros = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const eurosPrecise = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

/** Panier moyen saisi en euros → centimes, ou null si la valeur est inutilisable. */
export function basketToCents(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const normalized = typeof value === "string" ? value.replace(",", ".").trim() : value;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000) return null;
  return Math.round(amount * 100);
}

export function formatCents(cents: number): string {
  return euros.format(cents / 100);
}

export function formatCentsPrecise(cents: number): string {
  return eurosPrecise.format(cents / 100);
}

/**
 * Chiffre d'affaires représenté par les visites enregistrées.
 *
 * C'est une estimation assumée : visites × panier moyen. Elle ne prétend pas
 * mesurer le gain *incrémental* dû à la fidélité — l'affichage doit donc rester
 * honnête sur ce qu'il compte.
 */
export function loyalRevenueCents(visits: number, basketCents: number | null): number | null {
  if (basketCents === null || basketCents <= 0) return null;
  if (!Number.isFinite(visits) || visits <= 0) return 0;
  return Math.round(visits) * basketCents;
}

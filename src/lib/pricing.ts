/**
 * Prix de l'abonnement — source unique.
 *
 * Doit correspondre au tarif Stripe désigné par STRIPE_PRICE_ID. Un tarif Stripe
 * n'est pas modifiable : pour changer de prix, créez un nouveau tarif dans Stripe,
 * mettez à jour STRIPE_PRICE_ID, puis ajustez la valeur ci-dessous.
 */
export const PRICE_MONTHLY_EUR = 49.9;

/** Prix formaté pour l'affichage, par ex. « 49,90 € ». */
export const PRICE_LABEL = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
}).format(PRICE_MONTHLY_EUR);

/** Durée de l'essai gratuit annoncée publiquement (voir aussi STRIPE_TRIAL_DAYS). */
export const TRIAL_DAYS = 14;

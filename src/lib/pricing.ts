/**
 * Prix des abonnements — source unique.
 *
 * Chaque montant doit correspondre au tarif Stripe désigné par la variable
 * d'environnement associée. Un tarif Stripe n'est pas modifiable : pour changer
 * de prix, créez un nouveau tarif dans Stripe, mettez à jour la variable, puis
 * ajustez la valeur ci-dessous.
 */

/** Abonnement mensuel — STRIPE_PRICE_ID. */
export const PRICE_MONTHLY_EUR = 49.9;

/**
 * Abonnement annuel payé en une fois — STRIPE_PRICE_ID_YEARLY.
 * 480 € = 40 €/mois équivalent, soit −20 % sur le tarif mensuel.
 */
export const PRICE_YEARLY_EUR = 480;

/** Durée de l'essai gratuit annoncée publiquement (voir aussi STRIPE_TRIAL_DAYS). */
export const TRIAL_DAYS = 14;

export type Plan = "monthly" | "yearly";

const euros = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

export const PRICE_LABEL = euros.format(PRICE_MONTHLY_EUR);
export const PRICE_YEARLY_LABEL = euros.format(PRICE_YEARLY_EUR);

/** Équivalent mensuel de la formule annuelle, pour la comparaison. */
export const PRICE_YEARLY_PER_MONTH_LABEL = euros.format(
  Math.round((PRICE_YEARLY_EUR / 12) * 100) / 100,
);

/** Économie réalisée sur un an en payant d'avance. */
export const YEARLY_SAVING_EUR =
  Math.round((PRICE_MONTHLY_EUR * 12 - PRICE_YEARLY_EUR) * 100) / 100;
export const YEARLY_SAVING_LABEL = euros.format(YEARLY_SAVING_EUR);

/** Nombre de mois offerts, arrondi — sert l'argumentaire commercial. */
export const YEARLY_FREE_MONTHS = Math.round(YEARLY_SAVING_EUR / PRICE_MONTHLY_EUR);

export const PLAN_LABELS: Record<Plan, string> = {
  monthly: `${PRICE_LABEL} / mois`,
  yearly: `${PRICE_YEARLY_LABEL} / an`,
};

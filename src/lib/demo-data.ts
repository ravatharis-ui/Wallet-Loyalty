/**
 * Données de la page de démonstration.
 *
 * Volontairement statiques et hors base : cette page est un outil de vente, elle
 * doit s'afficher instantanément, ne jamais dépendre d'un état réel, et ne
 * jamais pouvoir être confondue avec le compte d'un vrai commerce.
 */

export const DEMO_BUSINESS = {
  name: "HERA",
  activity: "Accessoires femme",
  color: "#9d174d",
  program: {
    threshold: 8,
    rewardName: "1 accessoire offert",
  },
  averageBasketCents: 2800,
} as const;

export const DEMO_STATS = {
  customers: 247,
  visitsThisMonth: 138,
  rewardsRedeemed: 21,
  toReengage: 17,
} as const;

/** Six derniers mois de visites : la progression est l'argument de vente. */
export const DEMO_VISITS: { month: string; label: string; visits: number }[] = [
  { month: "Avr", label: "avril", visits: 62 },
  { month: "Mai", label: "mai", visits: 78 },
  { month: "Juin", label: "juin", visits: 91 },
  { month: "Juil", label: "juillet", visits: 104 },
  { month: "Août", label: "août", visits: 119 },
  { month: "Sept", label: "septembre", visits: 138 },
];

export const DEMO_INACTIVE = [
  { firstName: "Thomas", days: 42 },
  { firstName: "Julie", days: 51 },
  { firstName: "Marc", days: 68 },
  { firstName: "Inès", days: 73 },
] as const;

export const DEMO_CARD = {
  firstName: "Léa",
  points: 6,
} as const;

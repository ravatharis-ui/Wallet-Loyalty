/**
 * Regroupement des visites par mois — fonction pure, testée.
 * Sert la courbe du tableau de bord comme celle de la démonstration.
 */

export interface VisitsPoint {
  month: string;
  label: string;
  visits: number;
}

const shortMonth = new Intl.DateTimeFormat("fr-FR", { month: "short" });
const longMonth = new Intl.DateTimeFormat("fr-FR", { month: "long" });

/** Premier jour du mois, `offset` mois avant le mois de `now`. */
function monthStart(now: Date, offset: number): Date {
  return new Date(now.getFullYear(), now.getMonth() - offset, 1);
}

/** Début de la fenêtre d'historique, à passer en filtre SQL. */
export function historyStart(now: Date = new Date(), months = 6): string {
  return monthStart(now, months - 1).toISOString();
}

/**
 * Répartit des dates de visite sur les `months` derniers mois, mois courant
 * inclus. Les mois sans visite sont conservés à zéro : une courbe avec des
 * trous se lirait comme une baisse d'activité plutôt que comme une absence.
 */
export function bucketVisitsByMonth(
  dates: (string | Date)[],
  now: Date = new Date(),
  months = 6,
): VisitsPoint[] {
  const buckets: VisitsPoint[] = [];
  const index = new Map<string, number>();

  for (let offset = months - 1; offset >= 0; offset--) {
    const start = monthStart(now, offset);
    const key = `${start.getFullYear()}-${start.getMonth()}`;
    const short = shortMonth.format(start).replace(".", "");
    index.set(key, buckets.length);
    buckets.push({
      month: short.charAt(0).toUpperCase() + short.slice(1),
      label: longMonth.format(start),
      visits: 0,
    });
  }

  for (const value of dates) {
    const date = typeof value === "string" ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) continue;
    const position = index.get(`${date.getFullYear()}-${date.getMonth()}`);
    if (position !== undefined) buckets[position].visits += 1;
  }

  return buckets;
}

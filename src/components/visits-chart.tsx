import { cn } from "@/lib/utils";

export interface VisitsPoint {
  month: string;
  label: string;
  visits: number;
}

/**
 * Visites par mois.
 *
 * Une seule série : pas de légende, le titre nomme la mesure. Barres ancrées à
 * la ligne de base, extrémité arrondie, écart de 2px entre elles ; grille et
 * axes volontairement discrets. Seule la dernière valeur est étiquetée en
 * permanence — les autres apparaissent au survol.
 */
export function VisitsChart({
  data,
  color,
  className,
}: {
  data: VisitsPoint[];
  color: string;
  className?: string;
}) {
  const max = Math.max(...data.map((point) => point.visits));
  // Dizaine supérieure, avec une marge en haut : sans elle, la barre la plus
  // haute touche le plafond et son étiquette n'a plus de place.
  const scale = Math.ceil((max * 1.18) / 10) * 10;
  const gridLines = [0, 0.5, 1];

  return (
    <figure className={cn("m-0", className)}>
      <figcaption className="text-sm font-medium">Visites par mois</figcaption>
      <p className="mt-0.5 text-xs text-muted-foreground">6 derniers mois</p>

      <div className="relative mt-4 h-44 border-b border-border">
        {/* Grille de fond, volontairement discrète */}
        <div aria-hidden className="absolute inset-0 flex flex-col-reverse justify-between">
          {gridLines.map((line) => (
            <div key={line} className="border-t border-border/60" />
          ))}
        </div>

        <ol className="relative flex h-full items-end gap-0.5">
          {data.map((point, index) => {
            const isLast = index === data.length - 1;
            return (
              <li key={point.month} className="group flex h-full flex-1 items-end">
                <div
                  className="relative w-full transition-opacity group-hover:opacity-80"
                  style={{
                    height: `${(point.visits / scale) * 100}%`,
                    background: color,
                    borderTopLeftRadius: 4,
                    borderTopRightRadius: 4,
                  }}
                >
                  {/* Seule la dernière valeur est étiquetée en permanence. */}
                  {isLast ? (
                    <span className="absolute inset-x-0 bottom-full pb-1 text-center text-sm font-semibold">
                      {point.visits}
                    </span>
                  ) : null}
                  <div
                    role="tooltip"
                    className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-6 -translate-x-1/2 whitespace-nowrap rounded-lg bg-foreground px-2 py-1 text-xs text-background opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    {point.visits} visites en {point.label}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <ol className="mt-2 flex gap-0.5" aria-hidden>
        {data.map((point) => (
          <li key={point.month} className="flex-1 text-center text-xs text-muted-foreground">
            {point.month}
          </li>
        ))}
      </ol>

      {/* Les valeurs restent lisibles sans distinguer les couleurs ni survoler. */}
      <table className="sr-only">
        <caption>Visites par mois sur les six derniers mois</caption>
        <thead>
          <tr>
            <th scope="col">Mois</th>
            <th scope="col">Visites</th>
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.month}>
              <th scope="row">{point.label}</th>
              <td>{point.visits}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

import { readableTextColor, safeCardColor } from "@/lib/colors";
import { cn } from "@/lib/utils";

/**
 * Aperçu de la carte telle que le client la voit sur son téléphone.
 *
 * C'est l'objet que le commerçant achète : il est rendu une fois ici et
 * réutilisé partout (accueil, démonstration), pour que ce qu'on montre avant
 * la vente corresponde exactement à ce qui est livré après.
 */
export function LoyaltyCardPreview({
  businessName,
  firstName,
  points,
  threshold,
  color,
  rewardName,
  className,
}: {
  businessName: string;
  firstName: string;
  points: number;
  threshold: number;
  color: string;
  rewardName?: string;
  className?: string;
}) {
  const background = safeCardColor(color);
  const ink = readableTextColor(background);
  const remaining = Math.max(0, threshold - points);

  return (
    <div
      className={cn("grain relative overflow-hidden rounded-2xl p-6 shadow-lg", className)}
      style={{ background, color: ink }}
    >
      {/* Éclat unique en haut à gauche : une seule source de lumière. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 -top-24 h-64 w-64 rounded-full opacity-20"
        style={{ background: `radial-gradient(circle, ${ink} 0%, transparent 70%)` }}
      />

      <div className="relative">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] opacity-70">
          {businessName}
        </p>
        <p className="mt-1.5 font-display text-3xl leading-none">{firstName}</p>

        <div className="mt-6 flex flex-wrap gap-2" aria-hidden>
          {Array.from({ length: threshold }).map((_, index) => (
            <span
              key={index}
              className="h-4 w-4 rounded-full transition-colors"
              style={{
                background: index < points ? ink : "transparent",
                border: `1.5px solid ${ink}`,
                opacity: index < points ? 1 : 0.35,
              }}
            />
          ))}
        </div>

        <p className="mt-5 text-sm opacity-90">
          {remaining === 0 ? (
            <strong className="font-semibold">Récompense disponible</strong>
          ) : (
            <>
              <strong className="font-semibold">
                {remaining} visite{remaining > 1 ? "s" : ""}
              </strong>{" "}
              avant {rewardName ?? "votre récompense"}
            </>
          )}
        </p>
        <p className="sr-only">
          {points} visites enregistrées sur {threshold}.
        </p>
      </div>
    </div>
  );
}

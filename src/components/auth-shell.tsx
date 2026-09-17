import { Wordmark } from "@/components/brand";
import { LoyaltyCardPreview } from "@/components/loyalty-card-preview";

/**
 * Cadre commun aux pages de compte.
 *
 * Le panneau de gauche ne sert pas de décor : il montre l'objet qu'on vient
 * chercher. Il disparaît sous `lg`, où l'écran appartient entièrement au
 * formulaire.
 */
export function AuthShell({
  title,
  description,
  aside,
  children,
  footer,
}: {
  title: string;
  description?: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="grain relative hidden overflow-hidden border-r border-border bg-muted lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Wordmark />

        <div className="max-w-sm">
          <LoyaltyCardPreview
            businessName="Boulangerie Ti Pain"
            firstName="Marlène"
            points={7}
            threshold={10}
            color="#8c4a2f"
            rewardName="une viennoiserie offerte"
            className="rotate-[-1.5deg]"
          />
          <p className="mt-8 text-lg leading-relaxed">
            {aside ?? (
              <>
                La carte de fidélité de votre commerce, sur le téléphone de vos clients — et les
                relances qui les font revenir.
              </>
            )}
          </p>
        </div>

        <p className="text-sm text-muted-foreground">
          Édité par HERA 1, à Saint-André, La Réunion.
        </p>
      </aside>

      <main className="flex flex-col justify-center px-5 py-12 sm:px-10">
        <div className="mx-auto w-full max-w-sm">
          <div className="lg:hidden">
            <Wordmark />
          </div>
          <h1 className="mt-8 text-3xl font-semibold tracking-[-0.03em] lg:mt-0">{title}</h1>
          {description ? (
            <p className="mt-2 leading-relaxed text-muted-foreground">{description}</p>
          ) : null}
          {children}
          {footer ? <div className="mt-8 text-sm text-muted-foreground">{footer}</div> : null}
        </div>
      </main>
    </div>
  );
}

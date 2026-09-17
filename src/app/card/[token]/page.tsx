import { notFound } from "next/navigation";
import { Gift } from "lucide-react";
import { getCardByToken } from "@/lib/public-data";
import { affordableTiers, nextTier, progressLabel } from "@/lib/loyalty";
import { QrCode } from "@/components/qr-code";
import { Alert } from "@/components/ui/alert";
import { AddToHomeScreen } from "@/components/add-to-home-screen";
import { PushOptIn } from "@/components/push-opt-in";
import { ReferralShare } from "@/components/referral-share";
import { appUrl } from "@/lib/env";
import { formatDate, formatEuros } from "@/lib/utils";
import { readableTextColor, safeCardColor } from "@/lib/colors";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ma carte de fidélité",
  robots: { index: false, follow: false },
};

export default async function CardPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ new?: string; existing?: string }>;
}) {
  const { token } = await params;
  const { new: isNew, existing } = await searchParams;

  const data = await getCardByToken(token);
  if (!data) notFound();

  const { customer, business, program, tiers, availableRewards } = data;
  const rules = {
    mode: program?.mode ?? ("stamp" as const),
    points_per_visit: program?.points_per_visit ?? 1,
    points_per_euro: program?.points_per_euro ?? 1,
  };
  const isAmountMode = rules.mode === "amount";
  const cardColor = safeCardColor(business.card_color);
  const cardText = readableTextColor(cardColor);

  const reachable = affordableTiers(customer.current_points, tiers);
  const upcoming = nextTier(customer.current_points, tiers);
  // La jauge vise le prochain palier ; une fois le catalogue épuisé, le plus
  // cher sert de repère pour ne pas afficher une barre sans fin.
  const goal = upcoming?.points_cost ?? tiers[tiers.length - 1]?.points_cost ?? 0;
  const stamps = Math.min(customer.current_points, goal);
  const hasReward = reachable.length > 0 || availableRewards.length > 0;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8">
      {isNew ? (
        <Alert variant="success">
          Votre carte est prête. Ajoutez-la à votre écran d&apos;accueil pour la retrouver
          facilement.
        </Alert>
      ) : null}
      {existing ? <Alert>Vous aviez déjà une carte chez {business.name}. La voici.</Alert> : null}

      <section
        className="grain animate-rise relative mt-4 overflow-hidden rounded-2xl p-6 shadow-lg"
        style={{ background: cardColor, color: cardText }}
      >
        {/* Source de lumière unique, en haut à gauche, comme sur tous les aperçus. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-20 -top-28 h-72 w-72 rounded-full opacity-20"
          style={{ background: `radial-gradient(circle, ${cardText} 0%, transparent 70%)` }}
        />

        <div className="relative">
          <div className="flex items-center gap-3">
            {business.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- image externe hébergée par Supabase
              <img
                src={business.logo_url}
                alt=""
                className="h-12 w-12 rounded-xl bg-white/90 object-cover"
              />
            ) : null}
            <div className="min-w-0">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] opacity-70">
                {business.name}
              </p>
              <h1 className="truncate text-lg font-semibold tracking-[-0.015em]">
                {program?.name ?? "Programme fidélité"}
              </h1>
            </div>
          </div>

          <p className="mt-5 font-display text-4xl leading-none">{customer.first_name}</p>

          <div className="mt-7">
            <p className="text-sm opacity-75">
              {customer.current_points} point{customer.current_points > 1 ? "s" : ""}
              {goal > 0 && upcoming ? ` sur ${goal} pour ${upcoming.name}` : ""}
            </p>

            {/* Les cases à tamponner ne tiennent que si le palier est court ;
                au-delà, la barre reste lisible. */}
            {!isAmountMode && goal > 0 && goal <= 20 ? (
              <div
                className="mt-3 flex flex-wrap gap-2"
                role="img"
                aria-label={`${stamps} visites sur ${goal}`}
              >
                {Array.from({ length: goal }).map((_, index) => (
                  <span
                    key={index}
                    className="h-5 w-5 rounded-full"
                    style={{
                      background: index < stamps ? cardText : "transparent",
                      border: `2px solid ${cardText}`,
                      opacity: index < stamps ? 1 : 0.35,
                    }}
                  />
                ))}
              </div>
            ) : goal > 0 ? (
              <div
                className="mt-3 h-3 w-full overflow-hidden rounded-full"
                style={{ background: `${cardText}2e` }}
                role="img"
                aria-label={`${customer.current_points} points sur ${goal}`}
              >
                <div
                  className="h-full rounded-full transition-[width] duration-500 ease-[var(--ease-out-soft)]"
                  style={{
                    width: `${Math.min(100, (customer.current_points / goal) * 100)}%`,
                    background: cardText,
                  }}
                />
              </div>
            ) : null}

            <p className="mt-5 font-medium">
              {progressLabel(customer.current_points, rules, tiers)}
            </p>
          </div>

          {hasReward ? (
            <div
              className="mt-6 rounded-xl p-4"
              style={{ background: `${cardText}1f`, border: `1px solid ${cardText}3d` }}
            >
              <p className="flex items-center gap-2 font-semibold">
                <Gift className="h-5 w-5" aria-hidden />
                {reachable.length + availableRewards.length > 1
                  ? "Plusieurs récompenses à votre portée"
                  : "Récompense disponible"}
              </p>
              <p className="mt-1 text-sm opacity-90">
                {reachable[reachable.length - 1]?.name ?? availableRewards[0]?.reward_name} —
                présentez cette carte en caisse.
              </p>
            </div>
          ) : null}
        </div>
      </section>

      {/* Le catalogue donne une raison de revenir : sans lui, le compteur de
          points ne veut rien dire pour le client. */}
      {tiers.length > 0 ? (
        <section className="mt-6 rounded-card border border-border bg-surface p-6 shadow-xs">
          <p className="text-sm font-semibold">Vos récompenses</p>
          <ul className="mt-4 divide-y divide-border">
            {tiers.map((tier) => {
              const unlocked = tier.points_cost <= customer.current_points;
              return (
                <li key={tier.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className={unlocked ? "font-medium" : "text-muted-foreground"}>
                    {tier.name}
                  </span>
                  <span className="shrink-0 text-sm">
                    {unlocked ? (
                      <span className="font-semibold text-accent">Disponible</span>
                    ) : (
                      <span className="text-muted-foreground">
                        {tier.points_cost - customer.current_points} pts restants
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="mt-6 flex flex-col items-center rounded-card border border-border bg-surface p-6 shadow-xs">
        <p className="text-sm font-semibold">Votre QR code personnel</p>
        <p className="mb-5 text-xs text-muted-foreground">
          À présenter au commerçant à chaque visite.
        </p>
        <QrCode value={customer.card_token} size={220} alt="QR code de votre carte de fidélité" />
        <p className="mt-5 text-xs text-muted-foreground">
          Client depuis le {formatDate(customer.created_at)}
        </p>
      </section>

      {program && program.referral_points > 0 ? (
        <section className="mt-6 rounded-card border border-border bg-surface p-6 shadow-xs">
          <p className="text-sm font-semibold">Parrainez vos proches</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            Ils gagnent {program.referral_points} points d&apos;avance, et vous aussi dès leur
            passage en boutique
            {program.mode === "amount" && program.referral_min_amount_cents > 0
              ? ` avec un achat d'au moins ${formatEuros(program.referral_min_amount_cents)}`
              : ""}
            .
          </p>
          <ReferralShare
            url={`${appUrl()}/join/${business.slug}?p=${customer.referral_code}`}
            businessName={business.name}
            points={program.referral_points}
          />
        </section>
      ) : null}

      <PushOptIn token={customer.card_token} businessName={business.name} />

      <AddToHomeScreen />

      <p className="mt-8 text-center text-xs leading-relaxed text-muted-foreground">
        Lien perdu ?{" "}
        <a href={`/join/${business.slug}/retrouver`} className="underline underline-offset-2">
          Recevez-le à nouveau par email
        </a>
        . Pour supprimer vos données, contactez {business.name}
        {business.email ? ` (${business.email})` : ""}.
      </p>
    </main>
  );
}

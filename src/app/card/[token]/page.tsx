import { notFound } from "next/navigation";
import { Gift } from "lucide-react";
import { getCardByToken } from "@/lib/public-data";
import { progressLabel } from "@/lib/loyalty";
import { QrCode } from "@/components/qr-code";
import { Alert } from "@/components/ui/alert";
import { AddToHomeScreen } from "@/components/add-to-home-screen";
import { ReferralShare } from "@/components/referral-share";
import { appUrl } from "@/lib/env";
import { formatDate } from "@/lib/utils";
import { readableTextColor, safeCardColor } from "@/lib/colors";
import { formatEuros } from "@/lib/utils";

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

  const { customer, business, program, availableRewards } = data;
  const rules = {
    mode: program?.mode ?? ("stamp" as const),
    points_per_visit: program?.points_per_visit ?? 1,
    points_per_euro: program?.points_per_euro ?? 1,
    reward_threshold: program?.reward_threshold ?? 10,
  };
  const isAmountMode = rules.mode === "amount";
  const threshold = rules.reward_threshold;
  const cardColor = safeCardColor(business.card_color);
  const cardText = readableTextColor(cardColor);
  const points = Math.min(customer.current_points, threshold);
  const hasReward = availableRewards.length > 0;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8">
      {isNew ? (
        <Alert variant="success">
          Votre carte est prête ! Ajoutez-la à votre écran d&apos;accueil.
        </Alert>
      ) : null}
      {existing ? <Alert>Vous aviez déjà une carte chez {business.name}. La voici.</Alert> : null}

      <section
        className="mt-4 rounded-2xl p-6 shadow-sm"
        style={{ background: cardColor, color: cardText }}
      >
        <div className="flex items-center gap-3">
          {business.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- image externe hébergée par Supabase
            <img
              src={business.logo_url}
              alt=""
              className="h-12 w-12 rounded-xl bg-white/90 object-cover"
            />
          ) : null}
          <div>
            <p className="text-sm opacity-80">{business.name}</p>
            <h1 className="text-xl font-bold">{program?.name ?? "Programme fidélité"}</h1>
          </div>
        </div>
        <p className="mt-4 text-2xl font-semibold">{customer.first_name}</p>

        <div className="mt-6">
          <p className="text-sm opacity-80">
            {isAmountMode
              ? `${customer.current_points} / ${threshold} points`
              : `${points} / ${threshold} visites`}
          </p>
          {isAmountMode ? (
            <div
              className="mt-3 h-4 w-full overflow-hidden rounded-full"
              style={{ background: `${cardText}33` }}
              role="img"
              aria-label={`${customer.current_points} points sur ${threshold}`}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, (customer.current_points / threshold) * 100)}%`,
                  background: cardText,
                }}
              />
            </div>
          ) : (
            <div
              className="mt-3 flex flex-wrap gap-2"
              role="img"
              aria-label={`${points} visites sur ${threshold}`}
            >
              {Array.from({ length: threshold }).map((_, index) => (
                <span
                  key={index}
                  className="h-5 w-5 rounded-full"
                  style={{
                    background: index < points ? cardText : "transparent",
                    border: `2px solid ${cardText}`,
                    opacity: index < points ? 1 : 0.4,
                  }}
                />
              ))}
            </div>
          )}
          <p className="mt-4 font-medium">
            {hasReward
              ? "Votre récompense vous attend !"
              : progressLabel(customer.current_points, rules)}
          </p>
          {!hasReward && program ? (
            <p className="text-sm text-muted-foreground">Objectif : {program.reward_name}</p>
          ) : null}
        </div>

        {hasReward ? (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-green-900">
            <p className="flex items-center gap-2 font-semibold">
              <Gift className="h-5 w-5" aria-hidden />
              {availableRewards.length > 1
                ? `${availableRewards.length} récompenses disponibles`
                : "Récompense disponible"}
            </p>
            <p className="mt-1 text-sm">
              {availableRewards[0].reward_name} — présentez cette carte en caisse.
            </p>
          </div>
        ) : null}
      </section>

      <section className="mt-6 flex flex-col items-center rounded-2xl border border-border p-6">
        <p className="text-sm font-medium">Votre QR code personnel</p>
        <p className="mb-4 text-xs text-muted-foreground">
          À présenter au commerçant à chaque visite.
        </p>
        <QrCode value={customer.card_token} size={220} alt="QR code de votre carte de fidélité" />
        <p className="mt-4 text-xs text-muted-foreground">
          Client depuis le {formatDate(customer.created_at)}
        </p>
      </section>

      {program && program.referral_points > 0 ? (
        <section className="mt-6 rounded-2xl border border-border p-6">
          <p className="text-sm font-medium">Parrainez vos proches</p>
          <p className="mt-1 text-sm text-muted-foreground">
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

      <AddToHomeScreen />

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Lien perdu ?{" "}
        <a href={`/join/${business.slug}/retrouver`} className="underline">
          Recevez-le à nouveau par email
        </a>
        . Pour supprimer vos données, contactez {business.name}
        {business.email ? ` (${business.email})` : ""}.
      </p>
    </main>
  );
}

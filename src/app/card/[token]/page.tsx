import { notFound } from "next/navigation";
import { Gift } from "lucide-react";
import { getCardByToken } from "@/lib/public-data";
import { progressLabel, visitsUntilReward } from "@/lib/loyalty";
import { QrCode } from "@/components/qr-code";
import { Alert } from "@/components/ui/alert";
import { AddToHomeScreen } from "@/components/add-to-home-screen";
import { formatDate } from "@/lib/utils";

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
    points_per_visit: program?.points_per_visit ?? 1,
    reward_threshold: program?.reward_threshold ?? 10,
  };
  const threshold = rules.reward_threshold;
  const points = Math.min(customer.current_points, threshold);
  const hasReward = availableRewards.length > 0;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8">
      {isNew ? <Alert variant="success">Votre carte est prête ! Ajoutez-la à votre écran d&apos;accueil.</Alert> : null}
      {existing ? <Alert>Vous aviez déjà une carte chez {business.name}. La voici.</Alert> : null}

      <section className="mt-4 rounded-2xl border border-border bg-background p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">{business.name}</p>
        <h1 className="text-xl font-bold">{program?.name ?? "Programme fidélité"}</h1>
        <p className="mt-4 text-2xl font-semibold">{customer.first_name}</p>

        <div className="mt-6">
          <p className="text-sm text-muted-foreground">
            {points} / {threshold} visites
          </p>
          <div
            className="mt-3 flex flex-wrap gap-2"
            role="img"
            aria-label={`${points} visites sur ${threshold}`}
          >
            {Array.from({ length: threshold }).map((_, index) => (
              <span
                key={index}
                className={
                  index < points
                    ? "h-5 w-5 rounded-full bg-accent"
                    : "h-5 w-5 rounded-full border-2 border-border"
                }
              />
            ))}
          </div>
          <p className="mt-4 font-medium">
            {hasReward
              ? "Votre récompense vous attend !"
              : progressLabel(customer.current_points, rules)}
          </p>
          {!hasReward && visitsUntilReward(customer.current_points, rules) > 0 && program ? (
            <p className="text-sm text-muted-foreground">
              Objectif : {program.reward_name}
            </p>
          ) : null}
        </div>

        {hasReward ? (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="flex items-center gap-2 font-semibold text-green-900">
              <Gift className="h-5 w-5" aria-hidden />
              {availableRewards.length > 1
                ? `${availableRewards.length} récompenses disponibles`
                : "Récompense disponible"}
            </p>
            <p className="mt-1 text-sm text-green-800">
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

      <AddToHomeScreen />

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Conservez ce lien pour retrouver votre carte. Pour supprimer vos données, contactez{" "}
        {business.name}
        {business.email ? ` (${business.email})` : ""}.
      </p>
    </main>
  );
}

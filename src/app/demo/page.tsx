import Link from "next/link";
import { Gift, ScanLine } from "lucide-react";
import { DEMO_BUSINESS, DEMO_STATS, DEMO_VISITS, DEMO_INACTIVE, DEMO_CARD } from "@/lib/demo-data";
import { VisitsChart } from "@/components/visits-chart";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { readableTextColor } from "@/lib/colors";
import { loyalRevenueCents, formatCents, formatCentsPrecise } from "@/lib/revenue";
import { PRICE_LABEL, TRIAL_DAYS } from "@/lib/pricing";

export const metadata = {
  title: "Démonstration",
  description: "À quoi ressemble Fidelia après quelques mois d'utilisation.",
};

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
    </Card>
  );
}

export default function DemoPage() {
  const color = DEMO_BUSINESS.color;
  const textOnColor = readableTextColor(color);
  const revenue = loyalRevenueCents(DEMO_STATS.visitsThisMonth, DEMO_BUSINESS.averageBasketCents)!;

  return (
    <div className="min-h-dvh">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-3">
          <Link href="/" className="font-semibold">
            Fidelia
          </Link>
          <Badge variant="warning">Démonstration — données fictives</Badge>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-5 py-6">
        <div>
          <h1 className="text-2xl font-bold">
            {DEMO_BUSINESS.name}{" "}
            <span className="text-base font-normal text-muted-foreground">
              · {DEMO_BUSINESS.activity}
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            {DEMO_BUSINESS.program.threshold} visites = {DEMO_BUSINESS.program.rewardName}
          </p>
        </div>

        <Card style={{ background: color, color: textOnColor }}>
          <p className="text-sm opacity-80">
            Chiffre d&apos;affaires de vos clients fidèles ce mois
          </p>
          <p className="mt-1 text-4xl font-bold">{formatCents(revenue)}</p>
          <p className="mt-1 text-sm opacity-80">
            {DEMO_STATS.visitsThisMonth} visites ×{" "}
            {formatCentsPrecise(DEMO_BUSINESS.averageBasketCents)} de panier moyen
          </p>
        </Card>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Clients" value={DEMO_STATS.customers} />
          <Stat label="Visites ce mois" value={DEMO_STATS.visitsThisMonth} />
          <Stat label="Récompenses utilisées" value={DEMO_STATS.rewardsRedeemed} />
          <Stat label="À relancer" value={DEMO_STATS.toReengage} />
        </div>

        <div className="grid items-start gap-6 md:grid-cols-[1.4fr_1fr]">
          <Card>
            <VisitsChart data={DEMO_VISITS} color={color} />
          </Card>

          <div className="space-y-6">
            <Card className="p-0">
              <p className="px-5 pt-5 text-sm font-medium">Clients à relancer</p>
              <ul className="mt-2 divide-y divide-border">
                {DEMO_INACTIVE.map((customer) => (
                  <li
                    key={customer.firstName}
                    className="flex items-center justify-between px-5 py-3 text-sm"
                  >
                    <span className="font-medium">{customer.firstName}</span>
                    <span className="text-muted-foreground">il y a {customer.days} jours</span>
                  </li>
                ))}
              </ul>
              <p className="px-5 pb-5 pt-3 text-xs text-muted-foreground">
                Relancés automatiquement par email à 30 et 60 jours.
              </p>
            </Card>

            <Card className="space-y-3">
              <p className="text-sm font-medium">La carte de vos clients</p>
              <div className="rounded-2xl p-5" style={{ background: color, color: textOnColor }}>
                <p className="text-sm opacity-80">{DEMO_BUSINESS.name}</p>
                <p className="mt-1 text-xl font-bold">{DEMO_CARD.firstName}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {Array.from({ length: DEMO_BUSINESS.program.threshold }).map((_, index) => (
                    <span
                      key={index}
                      className="h-4 w-4 rounded-full"
                      style={{
                        background: index < DEMO_CARD.points ? textOnColor : "transparent",
                        border: `2px solid ${textOnColor}`,
                        opacity: index < DEMO_CARD.points ? 1 : 0.4,
                      }}
                    />
                  ))}
                </div>
                <p className="mt-3 text-sm opacity-90">
                  Plus que {DEMO_BUSINESS.program.threshold - DEMO_CARD.points} visites !
                </p>
              </div>
            </Card>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="flex items-center gap-3">
            <ScanLine className="h-5 w-5 shrink-0" aria-hidden />
            <p className="text-sm">
              <strong>Moins de 5 secondes</strong> pour enregistrer une visite : vous scannez, vous
              validez.
            </p>
          </Card>
          <Card className="flex items-center gap-3">
            <Gift className="h-5 w-5 shrink-0" aria-hidden />
            <p className="text-sm">
              La récompense se déclenche toute seule, et le client est prévenu par email.
            </p>
          </Card>
        </div>

        <Card className="text-center">
          <p className="text-lg font-semibold">Votre programme de fidélité, prêt en deux minutes</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {PRICE_LABEL} / mois · {TRIAL_DAYS} jours d&apos;essai · sans engagement
          </p>
          <Button asChild size="lg" className="mt-4">
            <Link href="/signup">Créer mon programme</Link>
          </Button>
        </Card>

        <p className="pb-6 text-center text-xs text-muted-foreground">
          Cette page présente un commerce fictif et des données inventées, à titre d&apos;exemple.
        </p>
      </main>
    </div>
  );
}

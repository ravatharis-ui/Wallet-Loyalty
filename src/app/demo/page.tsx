import Link from "next/link";
import { Gift, ScanLine, ArrowRight } from "lucide-react";
import {
  DEMO_BUSINESS,
  DEMO_STATS,
  DEMO_VISITS,
  DEMO_INACTIVE,
  DEMO_CARD,
  DEMO_TIERS,
} from "@/lib/demo-data";
import { VisitsChart } from "@/components/visits-chart";
import { growthPercent } from "@/lib/visits-history";
import { Card, CardLabel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wordmark } from "@/components/brand";
import { LoyaltyCardPreview } from "@/components/loyalty-card-preview";
import { readableTextColor } from "@/lib/colors";
import { PRICE_LABEL, TRIAL_DAYS } from "@/lib/pricing";

export const metadata = {
  title: "Démonstration",
  description: "À quoi ressemble Fidelia après quelques mois d'utilisation.",
};

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-5 py-4 first:pl-0 sm:py-0">
      <CardLabel>{label}</CardLabel>
      <p className="mt-1.5 text-3xl font-semibold tracking-[-0.03em]">{value}</p>
    </div>
  );
}

export default function DemoPage() {
  const color = DEMO_BUSINESS.color;
  const textOnColor = readableTextColor(color);
  const growth = growthPercent(DEMO_VISITS);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3.5">
          <Wordmark />
          <div className="flex items-center gap-3">
            <Badge variant="warning">Données fictives</Badge>
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link href="/signup">Créer mon programme</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <CardLabel>Espace commerçant</CardLabel>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">
              {DEMO_BUSINESS.name}
              <span className="ml-3 align-middle text-base font-normal text-muted-foreground">
                {DEMO_BUSINESS.activity}
              </span>
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {DEMO_TIERS.length} récompenses au catalogue, à partir de {DEMO_TIERS[0].pointsCost}{" "}
            visites
          </p>
        </div>

        {/* Le chiffre qui vend : mesuré, jamais déclaré. */}
        <section
          className="grain relative mt-8 overflow-hidden rounded-card p-8 shadow-md sm:p-10"
          style={{ background: color, color: textOnColor }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full opacity-15"
            style={{ background: `radial-gradient(circle, ${textOnColor} 0%, transparent 70%)` }}
          />
          <p className="relative text-sm opacity-80">Vos clients sont revenus</p>
          <p className="relative mt-2 text-5xl font-semibold tracking-[-0.04em] sm:text-6xl">
            {DEMO_STATS.visitsThisMonth} fois ce mois
          </p>
          <p className="relative mt-3 text-sm opacity-85">
            soit {growth} % de plus qu&apos;en {DEMO_VISITS[0].label}
          </p>
        </section>

        {/* Quatre chiffres séparés par un filet : la boîte n'apporte rien ici. */}
        <section className="mt-8 grid grid-cols-2 gap-y-2 divide-border sm:grid-cols-4 sm:divide-x">
          <Stat label="Clients" value={DEMO_STATS.customers} />
          <Stat label="Visites ce mois" value={DEMO_STATS.visitsThisMonth} />
          <Stat label="Récompenses utilisées" value={DEMO_STATS.rewardsRedeemed} />
          <Stat label="À relancer" value={DEMO_STATS.toReengage} />
        </section>

        <div className="mt-10 grid items-start gap-6 lg:grid-cols-[1.35fr_1fr]">
          <div className="space-y-6">
            <Card>
              <VisitsChart data={DEMO_VISITS} color={color} />
            </Card>

            <div className="grid gap-3 sm:grid-cols-2">
              <Card variant="flat" className="flex items-start gap-3">
                <ScanLine className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
                <p className="text-sm leading-relaxed">
                  <strong className="font-semibold">Moins de cinq secondes</strong> pour enregistrer
                  une visite : vous scannez, vous validez.
                </p>
              </Card>
              <Card variant="flat" className="flex items-start gap-3">
                <Gift className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
                <p className="text-sm leading-relaxed">
                  La récompense se déclenche toute seule, et le client est prévenu par email.
                </p>
              </Card>
            </div>
          </div>

          <div className="space-y-6">
            <Card className="p-0">
              <p className="px-5 pt-5 text-sm font-semibold">Clients à relancer</p>
              <ul className="mt-3 divide-y divide-border">
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
              <p className="px-5 pb-5 pt-3.5 text-xs leading-relaxed text-muted-foreground">
                Relancés automatiquement par email à 30 et 60 jours.
              </p>
            </Card>

            <div>
              <p className="mb-3 text-sm font-semibold">La carte de vos clients</p>
              <LoyaltyCardPreview
                businessName={DEMO_BUSINESS.name}
                firstName={DEMO_CARD.firstName}
                points={DEMO_CARD.points}
                threshold={DEMO_TIERS[0].pointsCost}
                color={color}
                rewardName={DEMO_TIERS[0].name.toLowerCase()}
              />
            </div>

            <Card>
              <p className="text-sm font-semibold">Votre catalogue</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Le client cumule des points et choisit quand il les dépense.
              </p>
              <ul className="mt-4 divide-y divide-border">
                {DEMO_TIERS.map((tier) => (
                  <li key={tier.name} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="text-sm">{tier.name}</span>
                    <span className="shrink-0 text-sm text-muted-foreground">
                      {tier.pointsCost} pts
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>

        <section className="mt-12 rounded-card border border-border bg-surface px-6 py-10 text-center shadow-xs">
          <h2 className="text-2xl font-semibold tracking-[-0.025em]">
            Votre programme, prêt en deux minutes
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {PRICE_LABEL} par mois · {TRIAL_DAYS} jours d&apos;essai · sans engagement
          </p>
          <Button asChild size="lg" className="mt-6">
            <Link href="/signup">
              Créer mon programme
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </section>

        <p className="py-8 text-center text-xs text-muted-foreground">
          Cette page présente un commerce fictif et des données inventées, à titre d&apos;exemple.
        </p>
      </main>
    </div>
  );
}

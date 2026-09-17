import Link from "next/link";
import { ScanLine, Gift, QrCode, Settings, ArrowRight } from "lucide-react";
import { requireMerchant } from "@/lib/auth";
import { getDashboardStats } from "@/lib/stats";
import { getActiveProgram } from "@/actions/loyalty";
import { Card, CardLabel } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { formatRelativeDays } from "@/lib/utils";
import { VisitsChart } from "@/components/visits-chart";
import { growthPercent } from "@/lib/visits-history";
import { safeCardColor, readableTextColor } from "@/lib/colors";

export const metadata = { title: "Tableau de bord" };

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-5 py-4 first:pl-0 sm:py-1">
      <CardLabel>{label}</CardLabel>
      <p className="mt-1.5 text-3xl font-semibold tracking-[-0.03em]">{value}</p>
    </div>
  );
}

/** Premier écran d'un commerce qui n'a encore aucun client : on montre la route. */
function GettingStarted({ hasProgram }: { hasProgram: boolean }) {
  const steps = [
    {
      icon: Settings,
      title: "Réglez votre programme",
      text: "Combien de visites, et ce que le client gagne.",
      href: "/dashboard/loyalty",
      action: "Configurer",
      done: hasProgram,
    },
    {
      icon: QrCode,
      title: "Imprimez votre affichette",
      text: "Le QR code que vos clients scannent pour créer leur carte.",
      href: "/dashboard/settings#qr",
      action: "Imprimer",
      done: false,
    },
    {
      icon: ScanLine,
      title: "Scannez votre premier client",
      text: "Sa carte apparaît, vous validez, la visite est comptée.",
      href: "/dashboard/scan",
      action: "Ouvrir le scanner",
      done: false,
    },
  ];

  return (
    <Card variant="raised" className="p-0">
      <div className="border-b border-border px-6 py-5">
        <h2 className="text-lg font-semibold tracking-[-0.02em]">Vos trois premières minutes</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Aucun client pour l&apos;instant. Voici par où commencer.
        </p>
      </div>
      <ol className="divide-y divide-border">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className="flex flex-wrap items-center gap-x-4 gap-y-3 px-6 py-4 sm:flex-nowrap"
          >
            <span
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background"
            >
              <step.icon className="h-4.5 w-4.5 text-accent" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                <span className="mr-2 text-muted-foreground">{index + 1}.</span>
                {step.title}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">{step.text}</p>
            </div>
            {step.done ? (
              <Badge variant="success">Fait</Badge>
            ) : (
              <Button asChild variant="outline" size="sm">
                <Link href={step.href}>{step.action}</Link>
              </Button>
            )}
          </li>
        ))}
      </ol>
    </Card>
  );
}

export default async function DashboardPage() {
  const session = await requireMerchant();
  const [stats, program] = await Promise.all([
    getDashboardStats(session.businessId),
    getActiveProgram(session.businessId),
  ]);

  const color = safeCardColor(session.business.card_color);
  const growth = growthPercent(stats.visitsByMonth);
  const isNewBusiness = stats.customers === 0;

  return (
    <div className="space-y-8">
      <header>
        <CardLabel>Tableau de bord</CardLabel>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">{session.business.name}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {program
            ? `${program.reward_threshold} visites = ${program.reward_name}`
            : "Configurez votre programme de fidélité pour commencer."}
        </p>
      </header>

      {!program ? (
        <Alert variant="error">
          Aucun programme actif.{" "}
          <Link href="/dashboard/loyalty" className="underline underline-offset-2">
            Configurer maintenant
          </Link>{" "}
          ou{" "}
          <Link href="/dashboard/aide" className="underline underline-offset-2">
            lire le guide
          </Link>
          .
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Button asChild size="lg" className="h-16 justify-start px-6 text-base">
          <Link href="/dashboard/scan">
            <ScanLine className="mr-1 h-5 w-5" aria-hidden />
            Scanner un client
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-16 justify-start px-6 text-base">
          <Link href="/dashboard/rewards">
            <Gift className="mr-1 h-5 w-5" aria-hidden />
            Récompenses
          </Link>
        </Button>
      </div>

      {isNewBusiness ? <GettingStarted hasProgram={Boolean(program)} /> : null}

      {stats.visitsThisMonth > 0 ? (
        <section
          className="grain relative overflow-hidden rounded-card p-8 shadow-md"
          style={{ background: color, color: readableTextColor(color) }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full opacity-15"
            style={{
              background: `radial-gradient(circle, ${readableTextColor(color)} 0%, transparent 70%)`,
            }}
          />
          <p className="relative text-sm opacity-80">Vos clients sont revenus</p>
          <p className="relative mt-2 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
            {stats.visitsThisMonth} fois ce mois
          </p>
          {growth !== null && growth > 0 ? (
            <p className="relative mt-2 text-sm opacity-85">
              soit {growth} % de plus qu&apos;en {stats.visitsByMonth[0].label}
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="grid grid-cols-2 gap-y-2 divide-border sm:grid-cols-4 sm:divide-x">
        <Stat label="Clients" value={stats.customers} />
        <Stat label="Visites ce mois" value={stats.visitsThisMonth} />
        <Stat label="Récompenses utilisées" value={stats.rewardsRedeemed} />
        <Stat label="À relancer" value={stats.toReengage} />
      </section>

      {stats.referred > 0 ? (
        <Card variant="flat" className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm leading-relaxed">
            <strong className="font-semibold">
              {stats.referred} client{stats.referred > 1 ? "s" : ""}
            </strong>{" "}
            vous {stats.referred > 1 ? "ont" : "a"} été amené
            {stats.referred > 1 ? "s" : ""} par vos clients fidèles.
          </p>
          <Badge variant="success">Parrainage</Badge>
        </Card>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <VisitsChart data={stats.visitsByMonth} color={color} />
        </Card>

        <div className="space-y-3">
          <h2 className="font-semibold tracking-[-0.01em]">Clients à relancer</h2>
          {stats.inactiveCustomers.length > 0 ? (
            <Card className="divide-y divide-border p-0">
              {stats.inactiveCustomers.map((customer) => (
                <Link
                  key={customer.id}
                  href={`/dashboard/customers/${customer.id}`}
                  className="flex items-center justify-between px-5 py-3 transition-colors first:rounded-t-card last:rounded-b-card hover:bg-muted"
                >
                  <span className="font-medium">{customer.first_name}</span>
                  <span className="text-sm text-muted-foreground">
                    {formatRelativeDays(customer.last_visit_at).toLowerCase()}
                  </span>
                </Link>
              ))}
            </Card>
          ) : (
            <Card variant="flat">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Personne n&apos;a disparu depuis plus de 30 jours.
              </p>
            </Card>
          )}
          <Button asChild variant="outline" className="w-full">
            <Link href="/dashboard/customers?filter=inactive">
              Voir les clients
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

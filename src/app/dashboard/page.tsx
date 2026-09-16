import Link from "next/link";
import { ScanLine, Gift } from "lucide-react";
import { requireMerchant } from "@/lib/auth";
import { getDashboardStats } from "@/lib/stats";
import { getActiveProgram } from "@/actions/loyalty";
import { Card } from "@/components/ui/card";
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
    <Card>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
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

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Bonjour 👋</h1>
        <p className="text-sm text-muted-foreground">
          {program
            ? `${program.reward_threshold} visites = ${program.reward_name}`
            : "Configurez votre programme de fidélité pour commencer."}
        </p>
      </header>

      {!program ? (
        <Alert variant="error">
          Aucun programme actif.{" "}
          <Link href="/dashboard/loyalty" className="underline">
            Configurer maintenant
          </Link>{" "}
          ou{" "}
          <Link href="/dashboard/aide" className="underline">
            lire le guide
          </Link>
          .
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Button asChild size="lg" className="h-16">
          <Link href="/dashboard/scan">
            <ScanLine className="mr-2 h-5 w-5" aria-hidden />
            Scanner un client
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-16">
          <Link href="/dashboard/rewards">
            <Gift className="mr-2 h-5 w-5" aria-hidden />
            Récompenses
          </Link>
        </Button>
      </div>

      {stats.visitsThisMonth > 0 ? (
        <Card style={{ background: color, color: readableTextColor(color) }}>
          <p className="text-sm opacity-80">Vos clients sont revenus</p>
          <p className="mt-1 text-4xl font-bold">{stats.visitsThisMonth} fois ce mois</p>
          {growth !== null && growth > 0 ? (
            <p className="mt-1 text-sm opacity-80">
              soit {growth} % de plus qu&apos;en {stats.visitsByMonth[0].label}
            </p>
          ) : null}
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Clients" value={stats.customers} />
        <Stat label="Visites ce mois" value={stats.visitsThisMonth} />
        <Stat label="Récompenses utilisées" value={stats.rewardsRedeemed} />
        <Stat label="À relancer" value={stats.toReengage} />
      </div>

      {stats.referred > 0 ? (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">
            <strong>
              {stats.referred} client{stats.referred > 1 ? "s" : ""}
            </strong>{" "}
            vous {stats.referred > 1 ? "ont" : "a"} été amené
            {stats.referred > 1 ? "s" : ""} par vos clients fidèles.
          </p>
          <Badge variant="success">Parrainage</Badge>
        </Card>
      ) : null}

      <div className="grid items-start gap-6 md:grid-cols-[1.4fr_1fr]">
        <Card>
          <VisitsChart data={stats.visitsByMonth} color={color} />
        </Card>

        <div className="space-y-3">
          <h2 className="font-semibold">Clients à relancer</h2>
          {stats.inactiveCustomers.length > 0 ? (
            <Card className="divide-y divide-border p-0">
              {stats.inactiveCustomers.map((customer) => (
                <Link
                  key={customer.id}
                  href={`/dashboard/customers/${customer.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-muted"
                >
                  <span className="font-medium">{customer.first_name}</span>
                  <span className="text-sm text-muted-foreground">
                    {formatRelativeDays(customer.last_visit_at).toLowerCase()}
                  </span>
                </Link>
              ))}
            </Card>
          ) : (
            <Card>
              <p className="text-sm text-muted-foreground">
                Aucun client inactif depuis plus de 30 jours. 🎉
              </p>
            </Card>
          )}
          <Button asChild variant="outline" className="w-full">
            <Link href="/dashboard/customers?filter=inactive">Voir les clients</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

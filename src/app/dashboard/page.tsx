import Link from "next/link";
import { ScanLine, Gift } from "lucide-react";
import { requireMerchant } from "@/lib/auth";
import { getDashboardStats } from "@/lib/stats";
import { getActiveProgram } from "@/actions/loyalty";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { formatRelativeDays } from "@/lib/utils";

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
          </Link>
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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Clients" value={stats.customers} />
        <Stat label="Visites ce mois" value={stats.visitsThisMonth} />
        <Stat label="Récompenses utilisées" value={stats.rewardsRedeemed} />
        <Stat label="À relancer" value={stats.toReengage} />
      </div>

      <section className="space-y-3">
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
                  Dernière visite : {formatRelativeDays(customer.last_visit_at).toLowerCase()}
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
        <Button asChild variant="outline">
          <Link href="/dashboard/customers?filter=inactive">Voir les clients</Link>
        </Button>
      </section>
    </div>
  );
}

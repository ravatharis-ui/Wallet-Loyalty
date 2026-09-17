import { requireAdmin, getMerchantHealth, SILENCE_ALERT_DAYS } from "@/lib/admin";
import { Card, CardLabel } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wordmark } from "@/components/brand";
import { formatDate, formatRelativeDays } from "@/lib/utils";
import type { SubscriptionStatus } from "@/lib/db.types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Suivi des commerces", robots: { index: false, follow: false } };

const statusLabels: Record<
  SubscriptionStatus,
  { label: string; variant: "default" | "success" | "warning" | "danger" | "accent" }
> = {
  none: { label: "Découverte", variant: "default" },
  trialing: { label: "Essai", variant: "accent" },
  active: { label: "Payant", variant: "success" },
  past_due: { label: "Impayé", variant: "danger" },
  unpaid: { label: "Impayé", variant: "danger" },
  canceled: { label: "Résilié", variant: "warning" },
  incomplete: { label: "Incomplet", variant: "warning" },
  incomplete_expired: { label: "Abandonné", variant: "warning" },
  paused: { label: "En pause", variant: "warning" },
};

function Silence({ days }: { days: number | null }) {
  if (days === null) {
    return <span className="font-medium text-danger">jamais scanné</span>;
  }
  if (days >= SILENCE_ALERT_DAYS) {
    return <span className="font-medium text-danger">{days} jours sans scan</span>;
  }
  return (
    <span className="text-muted-foreground">{days === 0 ? "aujourd'hui" : `il y a ${days} j`}</span>
  );
}

export default async function AdminPage() {
  await requireAdmin();
  const merchants = await getMerchantHealth();

  const paying = merchants.filter((m) => m.status === "active" || m.status === "trialing").length;
  const atRisk = merchants.filter(
    (m) => m.silentDays === null || m.silentDays >= SILENCE_ALERT_DAYS,
  ).length;
  const totalVisits30 = merchants.reduce((sum, m) => sum + m.visits30, 0);

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Wordmark />
        <p className="text-sm text-muted-foreground">Suivi des commerces</p>
      </header>

      <section className="mt-10 grid grid-cols-2 gap-y-2 divide-border sm:grid-cols-4 sm:divide-x">
        {[
          ["Commerces", merchants.length],
          ["Payants ou en essai", paying],
          ["Visites sur 30 jours", totalVisits30],
          ["À rappeler", atRisk],
        ].map(([label, value]) => (
          <div key={String(label)} className="px-5 py-4 first:pl-0 sm:py-1">
            <CardLabel>{label}</CardLabel>
            <p className="mt-1.5 text-3xl font-semibold tracking-[-0.03em]">{value}</p>
          </div>
        ))}
      </section>

      <p className="mt-8 max-w-[70ch] text-sm leading-relaxed text-muted-foreground">
        Trié par silence : en haut, les commerces qui n&apos;ont rien scanné depuis le plus
        longtemps. Un commerçant qui cesse de scanner résilie dans les deux mois — c&apos;est le
        seul signal qui prévient assez tôt pour aller le voir.
      </p>

      {merchants.length === 0 ? (
        <Card variant="flat" className="mt-6">
          <p className="text-sm text-muted-foreground">
            Aucun commerce inscrit pour l&apos;instant.
          </p>
        </Card>
      ) : (
        <Card className="mt-6 overflow-x-auto p-0">
          <table className="w-full min-w-[56rem] text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-5 py-3 font-medium">Commerce</th>
                <th className="px-3 py-3 font-medium">Abonnement</th>
                <th className="px-3 py-3 font-medium">Dernier scan</th>
                <th className="px-3 py-3 text-right font-medium">Visites 7 j</th>
                <th className="px-3 py-3 text-right font-medium">Visites 30 j</th>
                <th className="px-3 py-3 text-right font-medium">Clients</th>
                <th className="px-3 py-3 text-right font-medium">Retour</th>
                <th className="px-3 py-3 text-right font-medium">Push</th>
                <th className="px-5 py-3 text-right font-medium">Messages 30 j</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {merchants.map((merchant) => {
                const status = statusLabels[merchant.status];
                return (
                  <tr key={merchant.businessId}>
                    <td className="px-5 py-3">
                      <p className="font-medium">{merchant.name}</p>
                      <p className="text-xs text-muted-foreground">
                        inscrit le {formatDate(merchant.createdAt)}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </td>
                    <td className="px-3 py-3">
                      <Silence days={merchant.silentDays} />
                      {merchant.lastVisitAt ? (
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeDays(merchant.lastVisitAt).toLowerCase()}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-right">{merchant.visits7}</td>
                    <td className="px-3 py-3 text-right">{merchant.visits30}</td>
                    <td className="px-3 py-3 text-right">
                      {merchant.customers}
                      {merchant.newCustomersThisMonth > 0 ? (
                        <span className="text-xs text-accent">
                          {" "}
                          +{merchant.newCustomersThisMonth}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {merchant.returnRate === null ? "—" : `${merchant.returnRate} %`}
                    </td>
                    <td className="px-3 py-3 text-right">{merchant.pushSubscribers}</td>
                    <td className="px-5 py-3 text-right">{merchant.messagesSent30}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <p className="mt-8 max-w-[70ch] text-xs leading-relaxed text-muted-foreground">
        Cette page ne montre que des compteurs. Aucun prénom, téléphone ou email de client final
        n&apos;y figure : vos commerçants nous confient ces données pour leur programme, pas pour ce
        tableau. Pour les paiements, les essais et les échecs de prélèvement, Stripe reste la source
        de vérité.
      </p>
    </div>
  );
}

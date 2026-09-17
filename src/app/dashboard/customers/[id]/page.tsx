import { notFound } from "next/navigation";
import Link from "next/link";
import { requireMerchant } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getActiveProgram, getRewardTiers } from "@/actions/loyalty";
import { affordableTiers } from "@/lib/loyalty";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QrCode } from "@/components/qr-code";
import { formatDateTime, formatRelativeDays } from "@/lib/utils";
import { appUrl } from "@/lib/env";
import type { Customer, Message, Reward, Visit } from "@/lib/db.types";
import { DeleteCustomer } from "./delete-customer";

export const metadata = { title: "Fiche client" };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireMerchant();
  const supabase = await createSupabaseServerClient();

  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .eq("business_id", session.businessId)
    .maybeSingle<Customer>();

  if (!customer) notFound();

  const [{ data: visits }, { data: rewards }, { data: messages }, , tiers] = await Promise.all([
    supabase
      .from("visits")
      .select("*")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false })
      .limit(30)
      .returns<Visit[]>(),
    supabase
      .from("rewards")
      .select("*")
      .eq("customer_id", customer.id)
      .order("earned_at", { ascending: false })
      .returns<Reward[]>(),
    supabase
      .from("messages")
      .select("*")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false })
      .limit(10)
      .returns<Message[]>(),
    getActiveProgram(session.businessId),
    getRewardTiers(session.businessId),
  ]);

  const availableRewards = (rewards ?? []).filter((reward) => reward.status === "available");
  const reachable = affordableTiers(customer.current_points, tiers);

  return (
    <div className="space-y-6">
      <Link href="/dashboard/customers" className="text-sm text-muted-foreground underline">
        ← Tous les clients
      </Link>

      <header>
        <h1 className="text-3xl font-semibold tracking-[-0.03em]">{customer.first_name}</h1>
        <p className="text-sm text-muted-foreground">
          {customer.phone}
          {customer.email ? ` · ${customer.email}` : " · pas d'email"}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <p className="text-sm text-muted-foreground">Points</p>
          <p className="text-2xl font-semibold tracking-[-0.03em]">{customer.current_points}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Visites</p>
          <p className="text-2xl font-semibold tracking-[-0.03em]">{customer.total_visits}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Dernière visite</p>
          <p className="text-sm font-medium">{formatRelativeDays(customer.last_visit_at)}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">À échanger</p>
          <p className="text-2xl font-semibold tracking-[-0.03em]">
            {reachable.length + availableRewards.length}
          </p>
        </Card>
      </div>

      <Card className="flex flex-col items-center gap-3">
        <p className="text-sm font-medium">Carte du client</p>
        <QrCode value={customer.card_token} size={160} alt="QR code de la carte du client" />
        <Link
          href={`/card/${customer.card_token}`}
          className="text-xs text-muted-foreground underline"
          target="_blank"
        >
          {appUrl()}/card/{customer.card_token.slice(0, 8)}…
        </Link>
      </Card>

      <section className="space-y-3">
        <h2 className="font-semibold">Récompenses</h2>
        {rewards && rewards.length > 0 ? (
          <Card className="divide-y divide-border p-0">
            {rewards.map((reward) => (
              <div key={reward.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium">{reward.reward_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Gagnée le {formatDateTime(reward.earned_at)}
                  </p>
                </div>
                <Badge variant={reward.status === "available" ? "success" : "default"}>
                  {reward.status === "available" ? "Disponible" : "Utilisée"}
                </Badge>
              </div>
            ))}
          </Card>
        ) : (
          <Card>
            <p className="text-sm text-muted-foreground">Aucune récompense pour l&apos;instant.</p>
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Historique des visites</h2>
        {visits && visits.length > 0 ? (
          <Card className="divide-y divide-border p-0">
            {visits.map((visit) => (
              <div key={visit.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <span>{formatDateTime(visit.created_at)}</span>
                <span className="text-muted-foreground">+{visit.points_added} pt</span>
              </div>
            ))}
          </Card>
        ) : (
          <Card>
            <p className="text-sm text-muted-foreground">Aucune visite enregistrée.</p>
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Emails envoyés</h2>
        {messages && messages.length > 0 ? (
          <Card className="divide-y divide-border p-0">
            {messages.map((message) => (
              <div key={message.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <span>{message.subject ?? message.type}</span>
                <span className="text-muted-foreground">{formatDateTime(message.created_at)}</span>
              </div>
            ))}
          </Card>
        ) : (
          <Card>
            <p className="text-sm text-muted-foreground">Aucun email envoyé.</p>
          </Card>
        )}
      </section>

      <DeleteCustomer customerId={customer.id} firstName={customer.first_name} />
    </div>
  );
}

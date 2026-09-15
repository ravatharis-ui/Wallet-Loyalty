import { requireMerchant } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { RedeemButton } from "./redeem-button";

export const metadata = { title: "Récompenses" };

interface RewardRow {
  id: string;
  reward_name: string;
  status: string;
  earned_at: string;
  redeemed_at: string | null;
  customers: { first_name: string; phone: string } | null;
}

export default async function RewardsPage() {
  const session = await requireMerchant();
  const supabase = await createSupabaseServerClient();

  const [{ data: available }, { data: redeemed }] = await Promise.all([
    supabase
      .from("rewards")
      .select("id, reward_name, status, earned_at, redeemed_at, customers(first_name, phone)")
      .eq("business_id", session.businessId)
      .eq("status", "available")
      .order("earned_at", { ascending: true })
      .returns<RewardRow[]>(),
    supabase
      .from("rewards")
      .select("id, reward_name, status, earned_at, redeemed_at, customers(first_name, phone)")
      .eq("business_id", session.businessId)
      .eq("status", "redeemed")
      .order("redeemed_at", { ascending: false })
      .limit(50)
      .returns<RewardRow[]>(),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Récompenses</h1>
        <p className="text-sm text-muted-foreground">
          Quand un client présente sa récompense, marquez-la comme utilisée.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="font-semibold">Disponibles ({available?.length ?? 0})</h2>
        {available && available.length > 0 ? (
          available.map((reward) => (
            <Card key={reward.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{reward.customers?.first_name ?? "Client supprimé"}</p>
                <p className="text-sm text-muted-foreground">
                  {reward.reward_name} · gagnée le {formatDateTime(reward.earned_at)}
                </p>
              </div>
              <RedeemButton rewardId={reward.id} />
            </Card>
          ))
        ) : (
          <Card>
            <p className="text-sm text-muted-foreground">Aucune récompense en attente.</p>
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Utilisées</h2>
        {redeemed && redeemed.length > 0 ? (
          redeemed.map((reward) => (
            <Card key={reward.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{reward.customers?.first_name ?? "Client supprimé"}</p>
                <p className="text-sm text-muted-foreground">
                  {reward.reward_name} · utilisée le {formatDateTime(reward.redeemed_at)}
                </p>
              </div>
              <Badge variant="success">Utilisée</Badge>
            </Card>
          ))
        ) : (
          <Card>
            <p className="text-sm text-muted-foreground">Aucune récompense utilisée pour l&apos;instant.</p>
          </Card>
        )}
      </section>
    </div>
  );
}

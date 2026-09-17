import { requireMerchant } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import type { Campaign } from "@/lib/db.types";
import { canSendEmails } from "@/lib/loyalty";
import { CampaignForm } from "./campaign-form";

export const metadata = { title: "Campagnes" };

const audienceLabels: Record<string, string> = {
  all: "Tous les clients",
  inactive_30_days: "Absents depuis 30 jours",
  reward_available: "Récompense disponible",
};

export default async function CampaignsPage() {
  const session = await requireMerchant();
  const supabase = await createSupabaseServerClient();

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("*")
    .eq("business_id", session.businessId)
    .order("created_at", { ascending: false })
    .limit(20)
    .returns<Campaign[]>();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-[-0.03em]">Campagnes</h1>
        <p className="text-sm text-muted-foreground">
          Envoyez un email à vos clients. Réservé aux clients ayant renseigné leur email.
        </p>
      </header>

      <CampaignForm disabled={!canSendEmails(session.access)} />

      <section className="space-y-3">
        <h2 className="font-semibold">Historique</h2>
        {campaigns && campaigns.length > 0 ? (
          <Card className="divide-y divide-border p-0">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{campaign.name}</p>
                  <Badge variant={campaign.sent_at ? "success" : "warning"}>
                    {campaign.sent_at ? `${campaign.recipients} envoyés` : "Brouillon"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {audienceLabels[campaign.audience_type] ?? campaign.audience_type} ·{" "}
                  {formatDateTime(campaign.sent_at ?? campaign.created_at)}
                </p>
              </div>
            ))}
          </Card>
        ) : (
          <Card>
            <p className="text-sm text-muted-foreground">Aucune campagne envoyée.</p>
          </Card>
        )}
      </section>
    </div>
  );
}

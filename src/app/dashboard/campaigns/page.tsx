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
  reward_available: "Ont de quoi échanger",
  new_this_month: "Nouveaux ce mois-ci",
  best_customers: "Vos habitués",
};

const channelLabels: Record<string, string> = {
  email: "Email",
  push: "Notification",
  both: "Email + notification",
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
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          Écrivez à vos clients par email, par notification, ou les deux. Vous pouvez joindre une
          photo, personnaliser le message et programmer l&apos;envoi.
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
                  <Badge
                    variant={
                      campaign.status === "sent"
                        ? "success"
                        : campaign.status === "scheduled"
                          ? "accent"
                          : "warning"
                    }
                  >
                    {campaign.status === "sent"
                      ? `${campaign.recipients} envoyés`
                      : campaign.status === "scheduled"
                        ? "Programmée"
                        : "Brouillon"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {audienceLabels[campaign.audience_type] ?? campaign.audience_type} ·{" "}
                  {channelLabels[campaign.channel] ?? campaign.channel} ·{" "}
                  {campaign.status === "scheduled" && campaign.scheduled_at
                    ? `prévue le ${formatDateTime(campaign.scheduled_at)}`
                    : formatDateTime(campaign.sent_at ?? campaign.created_at)}
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

import { requireMerchant } from "@/lib/auth";
import { appUrl } from "@/lib/env";
import { PRICE_LABEL, PRICE_YEARLY_LABEL, TRIAL_DAYS } from "@/lib/pricing";
import { yearlyPlanAvailable } from "@/lib/stripe";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { QrCode } from "@/components/qr-code";
import { formatDate } from "@/lib/utils";
import { BusinessForm } from "./business-form";
import { LogoForm } from "./logo-form";
import { SubscriptionActions } from "./subscription-actions";
import { JoinQrActions } from "./join-qr-actions";

export const metadata = { title: "Réglages" };

const statusLabels: Record<string, { label: string; variant: "success" | "warning" | "danger" }> = {
  free: { label: "Mode découverte", variant: "warning" },
  active: { label: "Actif", variant: "success" },
  trialing: { label: "Période d'essai", variant: "success" },
  past_due: { label: "Paiement en retard", variant: "warning" },
  unpaid: { label: "Impayé", variant: "danger" },
  canceled: { label: "Résilié", variant: "danger" },
  paused: { label: "En pause", variant: "warning" },
  incomplete: { label: "Incomplet", variant: "warning" },
  incomplete_expired: { label: "Expiré", variant: "danger" },
  none: { label: "Aucun abonnement", variant: "warning" },
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ abonnement?: string }>;
}) {
  const session = await requireMerchant();
  const { abonnement } = await searchParams;

  const joinUrl = `${appUrl()}/join/${session.business.slug}`;
  const status =
    session.access.level === "free"
      ? statusLabels.free
      : (statusLabels[session.subscription?.status ?? "none"] ?? statusLabels.none);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-[-0.03em]">Réglages</h1>
      </header>

      {abonnement === "ok" ? (
        <Alert variant="success">
          Merci ! Votre abonnement est en cours d&apos;activation. Le statut se met à jour en
          quelques secondes.
        </Alert>
      ) : null}
      {abonnement === "annule" ? <Alert>Paiement annulé, aucun prélèvement effectué.</Alert> : null}
      {abonnement === "inconnu" ? (
        <Alert variant="error">Aucun abonnement Stripe trouvé pour ce commerce.</Alert>
      ) : null}

      <section className="space-y-3" id="qr">
        <h2 className="font-semibold">Votre QR code d&apos;inscription</h2>
        <Card className="flex flex-col items-center gap-4 text-center">
          <p className="text-lg font-semibold">Scannez pour rejoindre notre programme fidélité</p>
          <QrCode value={joinUrl} size={240} alt="QR code d'inscription à votre programme" />
          <p className="break-all text-xs text-muted-foreground">{joinUrl}</p>
          <JoinQrActions joinUrl={joinUrl} businessName={session.business.name} />
        </Card>
      </section>

      <section className="space-y-3" id="commerce">
        <h2 className="font-semibold">Votre commerce</h2>
        <BusinessForm business={session.business} />
      </section>

      <section className="space-y-3" id="logo">
        <h2 className="font-semibold">Votre logo</h2>
        <LogoForm logoUrl={session.business.logo_url} />
      </section>

      <section className="space-y-3" id="abonnement">
        <h2 className="font-semibold">Abonnement</h2>
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium">
                Fidelia — {PRICE_LABEL} / mois ou {PRICE_YEARLY_LABEL} / an
              </p>
              <p className="text-sm text-muted-foreground">
                {session.access.level === "free"
                  ? `${session.customerCount} / ${session.access.customerLimit} cartes clients utilisées — l'abonnement lève la limite et ouvre ${TRIAL_DAYS} jours d'essai.`
                  : session.subscription?.current_period_end
                    ? `Prochaine échéance : ${formatDate(session.subscription.current_period_end)}`
                    : `${TRIAL_DAYS} jours d'essai gratuit, sans engagement.`}
              </p>
            </div>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <SubscriptionActions
            hasCustomer={Boolean(session.subscription?.stripe_customer_id)}
            yearlyAvailable={yearlyPlanAvailable()}
          />
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Données personnelles</h2>
        <Card>
          <p className="text-sm text-muted-foreground">
            Vous êtes responsable des données de vos clients. Vous pouvez supprimer définitivement
            un client depuis sa fiche (onglet Clients), ce qui efface ses visites, ses récompenses
            et son historique d&apos;emails.
          </p>
        </Card>
      </section>
    </div>
  );
}

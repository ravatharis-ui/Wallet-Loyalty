"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { countAudienceAction, sendCampaignAction, type CampaignState } from "@/actions/campaigns";
import type { AudienceType } from "@/lib/db.types";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";

const audiences: { value: AudienceType; label: string }[] = [
  { value: "all", label: "Tous les clients" },
  { value: "inactive_30_days", label: "Clients absents depuis 30 jours" },
  { value: "reward_available", label: "Clients avec récompense disponible" },
];

export function CampaignForm({ disabled }: { disabled: boolean }) {
  // Remonter le formulaire après un envoi réinitialise proprement l'état de l'action.
  const [instance, setInstance] = useState(0);
  return (
    <CampaignFormInstance
      key={instance}
      disabled={disabled}
      onNewCampaign={() => setInstance((value) => value + 1)}
    />
  );
}

function CampaignFormInstance({
  disabled,
  onNewCampaign,
}: {
  disabled: boolean;
  onNewCampaign: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [audience, setAudience] = useState<AudienceType>("all");
  const [recipients, setRecipients] = useState<number | null>(null);
  const [counting, startCount] = useTransition();
  const [state, formAction] = useActionState<CampaignState, FormData>(sendCampaignAction, {});

  useEffect(() => {
    if (!open) return;
    startCount(async () => setRecipients(await countAudienceAction(audience)));
  }, [audience, open]);

  if (state.success) {
    return (
      <div className="space-y-3">
        <Alert variant="success">{state.success}</Alert>
        <Button size="lg" onClick={onNewCampaign} disabled={disabled}>
          Nouvelle campagne
        </Button>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="space-y-3">
        <Button size="lg" onClick={() => setOpen(true)} disabled={disabled}>
          Nouvelle campagne
        </Button>
        {disabled ? (
          <p className="text-sm text-muted-foreground">
            Activez votre abonnement pour envoyer des campagnes.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form action={formAction}>
      <Card className="space-y-4">
        <div>
          <Label htmlFor="name">Nom de la campagne</Label>
          <Input id="name" name="name" placeholder="Offre de printemps" required />
        </div>

        <div>
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            name="message"
            required
            placeholder="Bonjour, cette semaine le café est à 1 € pour nos clients fidèles."
          />
        </div>

        <div>
          <Label htmlFor="audienceType">Audience</Label>
          <select
            id="audienceType"
            name="audienceType"
            value={audience}
            onChange={(event) => setAudience(event.target.value as AudienceType)}
            className="h-12 w-full rounded-xl border border-border bg-background px-3 text-base"
          >
            {audiences.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <Alert>
          {counting || recipients === null
            ? "Calcul du nombre de destinataires…"
            : `${recipients} destinataire(s) recevront cet email.`}
        </Alert>

        {state.error ? <Alert variant="error">{state.error}</Alert> : null}

        <div className="flex gap-2">
          <SubmitButton size="lg" pendingText="Envoi…" disabled={recipients === 0}>
            Envoyer
          </SubmitButton>
          <Button type="button" variant="ghost" size="lg" onClick={() => setOpen(false)}>
            Annuler
          </Button>
        </div>
      </Card>
    </form>
  );
}

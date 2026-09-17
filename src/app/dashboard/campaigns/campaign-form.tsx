"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { ImagePlus, Send, Trash2 } from "lucide-react";
import {
  countAudienceAction,
  sendCampaignAction,
  sendTestCampaignAction,
  uploadCampaignImageAction,
  type CampaignState,
} from "@/actions/campaigns";
import type { AudienceType, CampaignChannel } from "@/lib/db.types";
import { Card } from "@/components/ui/card";
import { Input, Textarea, Select } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { cn } from "@/lib/utils";

const audiences: { value: AudienceType; label: string; hint: string }[] = [
  { value: "all", label: "Tous les clients", hint: "Tout votre fichier." },
  {
    value: "inactive_30_days",
    label: "Absents depuis 30 jours",
    hint: "Ceux qui s'éloignent. L'audience qui rapporte le plus.",
  },
  {
    value: "reward_available",
    label: "Ont de quoi échanger",
    hint: "Ils ont assez de points pour une récompense mais ne sont pas venus la chercher.",
  },
  {
    value: "new_this_month",
    label: "Nouveaux ce mois-ci",
    hint: "Pour déclencher la deuxième visite, la plus difficile.",
  },
  {
    value: "best_customers",
    label: "Vos habitués",
    hint: "Cinq visites ou plus. À traiter avec attention.",
  },
];

const channels: { value: CampaignChannel; label: string; hint: string }[] = [
  { value: "email", label: "Email", hint: "Tous ceux qui ont donné leur adresse." },
  { value: "push", label: "Notification", hint: "Ceux qui l'ont activée sur leur téléphone." },
  { value: "both", label: "Les deux", hint: "Portée maximale." },
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
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [audience, setAudience] = useState<AudienceType>("all");
  const [channel, setChannel] = useState<CampaignChannel>("email");
  const [recipients, setRecipients] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [counting, startCount] = useTransition();
  const [busy, startBusy] = useTransition();
  const [state, formAction] = useActionState<CampaignState, FormData>(sendCampaignAction, {});

  useEffect(() => {
    if (!open) return;
    startCount(async () => setRecipients(await countAudienceAction(audience)));
  }, [audience, open]);

  const withEmail = channel === "email" || channel === "both";

  function handleImage(file: File) {
    startBusy(async () => {
      const data = new FormData();
      data.append("image", file);
      const result = await uploadCampaignImageAction({}, data);
      if (result.error) setNotice(result.error);
      else {
        setImageUrl(result.url ?? "");
        setNotice(null);
      }
    });
  }

  function handleTest() {
    if (!formRef.current) return;
    startBusy(async () => {
      const result = await sendTestCampaignAction({}, new FormData(formRef.current!));
      setNotice(result.error ?? result.success ?? null);
    });
  }

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
    <form action={formAction} ref={formRef}>
      <Card className="space-y-5">
        <div>
          <Label htmlFor="name">Nom de la campagne</Label>
          <Input id="name" name="name" placeholder="Offre de printemps" required />
          <p className="mt-1 text-xs text-muted-foreground">
            Pour vous retrouver dans l&apos;historique. Vos clients ne le voient pas.
          </p>
        </div>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Par quel canal</legend>
          <input type="hidden" name="channel" value={channel} />
          <div className="grid gap-2 sm:grid-cols-3">
            {channels.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setChannel(option.value)}
                aria-pressed={channel === option.value}
                className={cn(
                  "rounded-lg border p-3 text-left transition-colors",
                  channel === option.value
                    ? "border-accent bg-accent-soft"
                    : "border-border hover:bg-muted",
                )}
              >
                <span className="block text-sm font-medium">{option.label}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                  {option.hint}
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        {withEmail ? (
          <div>
            <Label htmlFor="subject">Objet de l&apos;email</Label>
            <Input id="subject" name="subject" placeholder="Une surprise vous attend" />
            <p className="mt-1 text-xs text-muted-foreground">
              Facultatif. Vide, vos clients verront « Un message de votre commerce ».
            </p>
          </div>
        ) : null}

        <div>
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            name="message"
            required
            className="min-h-40"
            placeholder={
              "Bonjour {prenom},\n\nCette semaine, le café est à 1 € pour nos clients fidèles."
            }
          />
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Écrivez <code className="rounded bg-muted px-1">{"{prenom}"}</code> pour insérer le
            prénom de chaque client.
            {channel !== "email"
              ? " En notification, seuls les 160 premiers caractères s'affichent."
              : ""}
          </p>
        </div>

        {withEmail ? (
          <div>
            <Label htmlFor="image">Photo</Label>
            <input type="hidden" name="imageUrl" value={imageUrl} />
            {imageUrl ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- image hébergée par Supabase */}
                <img
                  src={imageUrl}
                  alt=""
                  className="h-20 w-32 rounded-lg border border-border object-cover"
                />
                <Button type="button" variant="ghost" size="sm" onClick={() => setImageUrl("")}>
                  <Trash2 className="h-4 w-4" aria-hidden />
                  Retirer
                </Button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border-strong px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted">
                <ImagePlus className="h-4 w-4" aria-hidden />
                {busy ? "Envoi de l'image…" : "Ajouter une photo (2 Mo maximum)"}
                <input
                  id="image"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) handleImage(file);
                  }}
                />
              </label>
            )}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="audienceType">À qui</Label>
            <Select
              id="audienceType"
              name="audienceType"
              value={audience}
              onChange={(event) => setAudience(event.target.value as AudienceType)}
            >
              {audiences.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {audiences.find((item) => item.value === audience)?.hint}
            </p>
          </div>

          <div>
            <Label htmlFor="scheduledAt">Envoyer plus tard</Label>
            <Input id="scheduledAt" name="scheduledAt" type="date" />
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Facultatif. La campagne part le matin de la date choisie.
            </p>
          </div>
        </div>

        <Alert>
          {counting || recipients === null
            ? "Calcul du nombre de destinataires…"
            : `${recipients} client${recipients > 1 ? "s" : ""} dans cette audience.`}
        </Alert>

        {notice ? <Alert>{notice}</Alert> : null}
        {state.error ? <Alert variant="error">{state.error}</Alert> : null}

        <div className="flex flex-wrap gap-2">
          <SubmitButton size="lg" pendingText="Envoi…" disabled={recipients === 0}>
            <Send className="h-4 w-4" aria-hidden />
            Envoyer
          </SubmitButton>
          {withEmail ? (
            <Button type="button" variant="outline" size="lg" onClick={handleTest} disabled={busy}>
              M&apos;envoyer un test
            </Button>
          ) : null}
          <Button type="button" variant="ghost" size="lg" onClick={() => setOpen(false)}>
            Annuler
          </Button>
        </div>
      </Card>
    </form>
  );
}

"use client";

import { useActionState, useState } from "react";
import { saveBusinessAction, type BusinessState } from "@/actions/business";
import type { Business } from "@/lib/db.types";
import { CARD_COLOR_PRESETS, readableTextColor, safeCardColor } from "@/lib/colors";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/submit-button";
import { cn } from "@/lib/utils";

export function BusinessForm({ business }: { business: Business }) {
  const [state, formAction] = useActionState<BusinessState, FormData>(saveBusinessAction, {});
  const [color, setColor] = useState(safeCardColor(business.card_color));
  const [name, setName] = useState(business.name);

  const textColor = readableTextColor(color);

  return (
    <form action={formAction}>
      <Card className="space-y-4">
        <div>
          <Label htmlFor="name">Nom du commerce</Label>
          <Input
            id="name"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="phone">Téléphone</Label>
          <Input id="phone" name="phone" type="tel" defaultValue={business.phone ?? ""} />
        </div>
        <div>
          <Label htmlFor="email">Email de contact</Label>
          <Input id="email" name="email" type="email" defaultValue={business.email ?? ""} />
          <p className="mt-1 text-xs text-muted-foreground">
            Vos clients y répondront s&apos;ils répondent à un email de fidélité.
          </p>
        </div>

        <div>
          <Label htmlFor="averageBasket">Panier moyen (facultatif)</Label>
          <Input
            id="averageBasket"
            name="averageBasket"
            inputMode="decimal"
            placeholder="28"
            defaultValue={
              business.average_basket_cents ? String(business.average_basket_cents / 100) : ""
            }
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Ce que dépense un client en moyenne, en euros. Sert à chiffrer sur votre tableau de bord
            ce que représentent vos clients fidèles. Laissez vide pour ne rien afficher.
          </p>
        </div>

        <div>
          <Label>Couleur de la carte</Label>
          <input type="hidden" name="cardColor" value={color} />
          <div className="flex flex-wrap items-center gap-2">
            {CARD_COLOR_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => setColor(preset.value)}
                aria-label={preset.label}
                aria-pressed={color === preset.value}
                className={cn(
                  "h-9 w-9 rounded-full border-2 transition-transform",
                  color === preset.value
                    ? "scale-110 border-foreground"
                    : "border-transparent hover:scale-105",
                )}
                style={{ background: preset.value }}
              />
            ))}
            <label className="ml-1 flex items-center gap-2 text-sm text-muted-foreground">
              Autre
              <input
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className="h-9 w-12 cursor-pointer rounded border border-border bg-background"
                aria-label="Couleur personnalisée"
              />
            </label>
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium">Aperçu</p>
          <div
            className="rounded-2xl p-5"
            style={{ background: color, color: textColor }}
            role="img"
            aria-label={`Aperçu de la carte de ${name}`}
          >
            <p className="text-sm opacity-80">{name || "Votre commerce"}</p>
            <p className="mt-1 text-xl font-bold">Thomas</p>
            <div className="mt-4 flex gap-1.5">
              {Array.from({ length: 10 }).map((_, index) => (
                <span
                  key={index}
                  className="h-4 w-4 rounded-full"
                  style={{
                    background: index < 7 ? textColor : "transparent",
                    border: `2px solid ${textColor}`,
                    opacity: index < 7 ? 1 : 0.4,
                  }}
                />
              ))}
            </div>
            <p className="mt-3 text-sm opacity-90">Plus que 3 visites !</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Identifiant public : <code>/join/{business.slug}</code> — non modifiable pour que vos QR
          codes imprimés restent valides.
        </p>

        {state.error ? <Alert variant="error">{state.error}</Alert> : null}
        {state.success ? <Alert variant="success">{state.success}</Alert> : null}

        <SubmitButton pendingText="Enregistrement…">Enregistrer</SubmitButton>
      </Card>
    </form>
  );
}

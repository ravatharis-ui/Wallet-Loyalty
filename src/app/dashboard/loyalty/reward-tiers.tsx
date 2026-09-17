"use client";

import { useActionState } from "react";
import { Trash2, Plus } from "lucide-react";
import { saveRewardTierAction, deleteRewardTierAction, type ActionState } from "@/actions/loyalty";
import type { LoyaltyMode, RewardTier } from "@/lib/db.types";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";

/** Le mot juste selon le mode : on tamponne des visites, on cumule des points. */
function unit(mode: LoyaltyMode, count: number): string {
  if (mode === "stamp") return count > 1 ? "visites" : "visite";
  return count > 1 ? "points" : "point";
}

function TierRow({
  tier,
  mode,
  showLabels,
}: {
  tier: RewardTier;
  mode: LoyaltyMode;
  /** Les libellés ne sont affichés qu'en tête de liste ; ailleurs ils restent
      lisibles par les lecteurs d'écran mais n'encombrent plus l'œil. */
  showLabels: boolean;
}) {
  const [saveState, save] = useActionState<ActionState, FormData>(saveRewardTierAction, {});
  const [deleteState, remove] = useActionState<ActionState, FormData>(deleteRewardTierAction, {});

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-end gap-3">
        <form action={save} className="flex flex-1 flex-wrap items-end gap-3">
          <input type="hidden" name="tierId" value={tier.id} />
          <div className="min-w-44 flex-1">
            <Label htmlFor={`name-${tier.id}`} className={showLabels ? undefined : "sr-only"}>
              Récompense
            </Label>
            <Input id={`name-${tier.id}`} name="name" defaultValue={tier.name} required />
          </div>
          <div className="w-32">
            <Label htmlFor={`cost-${tier.id}`} className={showLabels ? undefined : "sr-only"}>
              Coût
            </Label>
            <Input
              id={`cost-${tier.id}`}
              name="pointsCost"
              type="number"
              min={1}
              max={100000}
              defaultValue={tier.points_cost}
              required
            />
          </div>
          <SubmitButton variant="outline" pendingText="…">
            Enregistrer
          </SubmitButton>
        </form>

        <form action={remove}>
          <input type="hidden" name="tierId" value={tier.id} />
          <Button variant="ghost" size="icon" type="submit" aria-label={`Retirer ${tier.name}`}>
            <Trash2 className="h-4 w-4" aria-hidden />
          </Button>
        </form>
      </div>

      <p className="mt-1.5 text-xs text-muted-foreground">
        {tier.points_cost} {unit(mode, tier.points_cost)} à cumuler.
      </p>

      {saveState.error ? (
        <Alert variant="error" className="mt-2">
          {saveState.error}
        </Alert>
      ) : null}
      {deleteState.error ? (
        <Alert variant="error" className="mt-2">
          {deleteState.error}
        </Alert>
      ) : null}
    </li>
  );
}

export function RewardTiers({ tiers, mode }: { tiers: RewardTier[]; mode: LoyaltyMode }) {
  const [state, addTier] = useActionState<ActionState, FormData>(saveRewardTierAction, {});

  return (
    <Card className="space-y-5">
      <div>
        <CardTitle>Catalogue des récompenses</CardTitle>
        <CardDescription>
          Vos clients cumulent des {mode === "stamp" ? "tampons" : "points"} et les dépensent quand
          ils le décident. Proposez une petite récompense accessible et une plus ambitieuse :
          c&apos;est ce qui fait revenir.
        </CardDescription>
      </div>

      {tiers.length > 0 ? (
        <ul className="divide-y divide-border">
          {tiers.map((tier, index) => (
            <TierRow key={tier.id} tier={tier} mode={mode} showLabels={index === 0} />
          ))}
        </ul>
      ) : (
        <Alert>
          Aucune récompense pour l&apos;instant. Tant que le catalogue est vide, les points de vos
          clients ne servent à rien.
        </Alert>
      )}

      <form action={addTier} className="flex flex-wrap items-end gap-3 border-t border-border pt-5">
        <div className="min-w-44 flex-1">
          <Label htmlFor="new-name">Ajouter une récompense</Label>
          <Input id="new-name" name="name" placeholder="1 café offert" required />
        </div>
        <div className="w-32">
          <Label htmlFor="new-cost">Coût</Label>
          <Input
            id="new-cost"
            name="pointsCost"
            type="number"
            min={1}
            max={100000}
            placeholder="10"
            required
          />
        </div>
        <SubmitButton pendingText="Ajout…">
          <Plus className="h-4 w-4" aria-hidden />
          Ajouter
        </SubmitButton>
      </form>

      {state.error ? <Alert variant="error">{state.error}</Alert> : null}
      {state.success ? <Alert variant="success">{state.success}</Alert> : null}
    </Card>
  );
}

"use client";

import { useActionState, useState } from "react";
import { saveLoyaltyProgramAction, type ActionState } from "@/actions/loyalty";
import type { LoyaltyMode, LoyaltyProgram } from "@/lib/db.types";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/submit-button";
import { cn } from "@/lib/utils";

const modes: { value: LoyaltyMode; title: string; description: string }[] = [
  {
    value: "stamp",
    title: "Carte à tamponner",
    description:
      "Chaque passage vaut un tampon, quel que soit le montant. Le plus simple, idéal quand vos prix varient peu.",
  },
  {
    value: "amount",
    title: "Points selon le montant",
    description:
      "Le client gagne des points proportionnels à ce qu'il dépense. Vous saisissez le montant au moment du scan.",
  },
];

export function LoyaltyForm({ program }: { program: LoyaltyProgram | null }) {
  const [state, formAction] = useActionState<ActionState, FormData>(saveLoyaltyProgramAction, {});
  const [mode, setMode] = useState<LoyaltyMode>(program?.mode ?? "stamp");
  const [threshold, setThreshold] = useState(program?.reward_threshold ?? 10);
  const [perEuro, setPerEuro] = useState(program?.points_per_euro ?? 1);
  const [rewardName, setRewardName] = useState(program?.reward_name ?? "1 café offert");

  return (
    <form action={formAction} className="space-y-5">
      <Card className="space-y-4">
        <div>
          <Label htmlFor="name">Nom du programme</Label>
          <Input id="name" name="name" defaultValue={program?.name ?? "Ma fidélité"} required />
        </div>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Comment vos clients gagnent</legend>
          <input type="hidden" name="mode" value={mode} />
          <div className="grid gap-2 sm:grid-cols-2">
            {modes.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setMode(option.value)}
                aria-pressed={mode === option.value}
                className={cn(
                  "rounded-xl border p-4 text-left transition-colors",
                  mode === option.value
                    ? "border-accent bg-muted"
                    : "border-border hover:bg-muted/60",
                )}
              >
                <span className="block font-medium">{option.title}</span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {option.description}
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        {mode === "stamp" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="pointsPerVisit">Tampons par visite</Label>
              <Input
                id="pointsPerVisit"
                name="pointsPerVisit"
                type="number"
                min={1}
                max={100}
                defaultValue={program?.points_per_visit ?? 1}
                required
              />
            </div>
            <div>
              <Label htmlFor="rewardThreshold">Tampons pour une récompense</Label>
              <Input
                id="rewardThreshold"
                name="rewardThreshold"
                type="number"
                min={1}
                max={1000}
                value={threshold}
                onChange={(event) => setThreshold(Number(event.target.value))}
                required
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="pointsPerEuro">Points par euro dépensé</Label>
              <Input
                id="pointsPerEuro"
                name="pointsPerEuro"
                type="number"
                min={1}
                max={100}
                value={perEuro}
                onChange={(event) => setPerEuro(Number(event.target.value))}
                required
              />
            </div>
            <div>
              <Label htmlFor="rewardThreshold">Points pour une récompense</Label>
              <Input
                id="rewardThreshold"
                name="rewardThreshold"
                type="number"
                min={1}
                max={1000}
                value={threshold}
                onChange={(event) => setThreshold(Number(event.target.value))}
                required
              />
            </div>
          </div>
        )}

        <div>
          <Label htmlFor="rewardName">Récompense</Label>
          <Input
            id="rewardName"
            name="rewardName"
            value={rewardName}
            onChange={(event) => setRewardName(event.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="rewardDescription">Description (facultatif)</Label>
          <Textarea
            id="rewardDescription"
            name="rewardDescription"
            defaultValue={program?.reward_description ?? ""}
            placeholder="Valable sur place, hors formules."
          />
        </div>

        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            name="active"
            defaultChecked={program?.active ?? true}
            className="h-5 w-5 rounded border-border"
          />
          Programme actif
        </label>
      </Card>

      <Card className="bg-muted">
        <p className="text-sm font-medium">Aperçu pour vos clients</p>
        <p className="mt-1 text-lg font-semibold">
          {mode === "stamp" ? (
            <>
              {threshold} visite{threshold > 1 ? "s" : ""} = {rewardName || "votre récompense"}
            </>
          ) : (
            <>
              {threshold} points = {rewardName || "votre récompense"}
            </>
          )}
        </p>
        {mode === "amount" ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Soit {Math.ceil(threshold / Math.max(1, perEuro))} € dépensés, à raison de {perEuro}{" "}
            point{perEuro > 1 ? "s" : ""} par euro.
          </p>
        ) : null}
      </Card>

      {state.error ? <Alert variant="error">{state.error}</Alert> : null}
      {state.success ? <Alert variant="success">{state.success}</Alert> : null}

      <SubmitButton size="lg" className="w-full sm:w-auto" pendingText="Enregistrement…">
        Enregistrer
      </SubmitButton>
    </form>
  );
}

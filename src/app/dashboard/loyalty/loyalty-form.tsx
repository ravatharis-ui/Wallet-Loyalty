"use client";

import { useActionState, useState } from "react";
import { saveLoyaltyProgramAction, type ActionState } from "@/actions/loyalty";
import type { LoyaltyProgram } from "@/lib/db.types";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/submit-button";

export function LoyaltyForm({ program }: { program: LoyaltyProgram | null }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    saveLoyaltyProgramAction,
    {},
  );
  const [threshold, setThreshold] = useState(program?.reward_threshold ?? 10);
  const [rewardName, setRewardName] = useState(program?.reward_name ?? "1 café offert");

  return (
    <form action={formAction} className="space-y-5">
      <Card className="space-y-4">
        <div>
          <Label htmlFor="name">Nom du programme</Label>
          <Input id="name" name="name" defaultValue={program?.name ?? "Ma fidélité"} required />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="pointsPerVisit">Points par visite</Label>
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
          {threshold} visite{threshold > 1 ? "s" : ""} = {rewardName || "votre récompense"}
        </p>
      </Card>

      {state.error ? <Alert variant="error">{state.error}</Alert> : null}
      {state.success ? <Alert variant="success">{state.success}</Alert> : null}

      <SubmitButton size="lg" className="w-full sm:w-auto" pendingText="Enregistrement…">
        Enregistrer
      </SubmitButton>
    </form>
  );
}

"use client";

import { useActionState, useState } from "react";
import { saveLoyaltyProgramAction, type ActionState } from "@/actions/loyalty";
import type { LoyaltyMode, LoyaltyProgram } from "@/lib/db.types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  const [perEuro, setPerEuro] = useState(program?.points_per_euro ?? 1);
  const [referralPoints, setReferralPoints] = useState(program?.referral_points ?? 0);
  const [referralMinAmount, setReferralMinAmount] = useState(
    program?.referral_min_amount_cents ? String(program.referral_min_amount_cents / 100) : "",
  );
  const [referralMonthlyLimit, setReferralMonthlyLimit] = useState(
    program?.referral_monthly_limit ?? 0,
  );

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
          </div>
        )}

        <div>
          <Label htmlFor="referralPoints">Bonus de parrainage</Label>
          <Input
            id="referralPoints"
            name="referralPoints"
            type="number"
            min={0}
            max={10000}
            value={referralPoints}
            onChange={(event) => setReferralPoints(Number(event.target.value))}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Points offerts au parrain <strong>et</strong> au filleul, à la première visite du
            filleul. Mettez 0 pour désactiver le parrainage.
          </p>
        </div>

        {referralPoints > 0 ? (
          <div className="grid gap-4 rounded-xl border border-border p-4 sm:grid-cols-2">
            <p className="text-sm font-medium sm:col-span-2">
              Conditions du parrainage
              <span className="ml-2 font-normal text-muted-foreground">pour éviter les abus</span>
            </p>

            {mode === "amount" ? (
              <div>
                <Label htmlFor="referralMinAmount">Achat minimum du filleul</Label>
                <Input
                  id="referralMinAmount"
                  name="referralMinAmount"
                  inputMode="decimal"
                  placeholder="20"
                  value={referralMinAmount}
                  onChange={(event) => setReferralMinAmount(event.target.value)}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  En euros. En dessous, le bonus attend : il sera versé au premier passage du
                  filleul qui atteint ce montant. Laissez vide pour n&apos;imposer aucun montant.
                </p>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                L&apos;achat minimum n&apos;est disponible qu&apos;en mode « points selon le montant
                » : en mode tampon, le montant n&apos;est pas saisi.
              </div>
            )}

            <div>
              <Label htmlFor="referralMonthlyLimit">Parrainages par client et par mois</Label>
              <Input
                id="referralMonthlyLimit"
                name="referralMonthlyLimit"
                type="number"
                min={0}
                max={1000}
                value={referralMonthlyLimit}
                onChange={(event) => setReferralMonthlyLimit(Number(event.target.value))}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Sur 30 jours glissants. Au-delà, le filleul s&apos;inscrit normalement mais le bonus
                n&apos;est plus versé. 0 = illimité.
              </p>
            </div>
          </div>
        ) : null}

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

      <Card variant="flat">
        <p className="text-sm font-medium">Aperçu pour vos clients</p>
        <p className="mt-1 text-lg font-semibold">
          {mode === "stamp"
            ? "Un tampon à chaque passage, à dépenser dans le catalogue."
            : `${perEuro} point${perEuro > 1 ? "s" : ""} par euro dépensé, à dépenser dans le catalogue.`}
        </p>
        {referralPoints > 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Parrainage : {referralPoints} points pour le parrain et pour le filleul
            {mode === "amount" && referralMinAmount
              ? `, à partir de ${referralMinAmount} € d'achat`
              : ""}
            {referralMonthlyLimit > 0
              ? `, dans la limite de ${referralMonthlyLimit} par mois et par client`
              : ""}
            .
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

"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { Camera, X, Check, Gift, Users } from "lucide-react";
import {
  addVisitAction,
  lookupCustomerAction,
  redeemTierAction,
  searchCustomerAction,
  type AddVisitState,
  type CustomerSummary,
} from "@/actions/visits";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { formatRelativeDays } from "@/lib/utils";

// Le scanner accède à la caméra : chargé uniquement côté navigateur.
const QrReader = dynamic(() => import("@/components/qr-reader").then((m) => m.QrReader), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 items-center justify-center rounded-2xl bg-muted text-sm text-muted-foreground">
      Ouverture de la caméra…
    </div>
  ),
});

type Mode = "idle" | "scanning" | "customer";

export function ScanClient() {
  const [mode, setMode] = useState<Mode>("idle");
  const [customer, setCustomer] = useState<CustomerSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visit, setVisit] = useState<AddVisitState | null>(null);
  const [query, setQuery] = useState("");
  const [amount, setAmount] = useState("");
  const [redeemed, setRedeemed] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setMode("idle");
    setCustomer(null);
    setError(null);
    setVisit(null);
    setQuery("");
    setAmount("");
  }

  function handleToken(token: string) {
    if (pending) return;
    setMode("customer");
    startTransition(async () => {
      const result = await lookupCustomerAction(token);
      if (result.error) {
        setError(result.error);
        setCustomer(null);
      } else {
        setError(null);
        setCustomer(result.customer ?? null);
      }
    });
  }

  function handleSearch() {
    startTransition(async () => {
      const result = await searchCustomerAction(query);
      if (result.error) {
        setError(result.error);
        setCustomer(null);
      } else {
        setError(null);
        setCustomer(result.customer ?? null);
        setMode("customer");
      }
    });
  }

  function handleAddVisit() {
    if (!customer || pending) return;
    startTransition(async () => {
      const result = await addVisitAction(customer.id, amount);
      setVisit(result);
      if (result.result) {
        setCustomer({
          ...customer,
          currentPoints: result.result.currentPoints,
          totalVisits: result.result.totalVisits,
        });
      }
    });
  }

  function handleRedeem(tierId: string, pointsCost: number) {
    if (!customer || pending) return;
    startTransition(async () => {
      const result = await redeemTierAction(customer.id, tierId);
      if (result.error) {
        setRedeemed(null);
        setError(result.error);
        return;
      }
      setError(null);
      setRedeemed(result.success ?? null);
      setCustomer({ ...customer, currentPoints: customer.currentPoints - pointsCost });
    });
  }

  // Ce que le solde permet, et ce qui reste à atteindre. Calculé ici plutôt que
  // dans le JSX : le même découpage sert au compteur et au catalogue.
  const tiers = customer?.tiers ?? [];
  const points = customer?.currentPoints ?? 0;
  const affordable = tiers.filter((tier) => tier.pointsCost <= points);
  const upcoming = tiers.find((tier) => tier.pointsCost > points) ?? null;
  const goal = upcoming?.pointsCost ?? tiers[tiers.length - 1]?.pointsCost ?? 0;

  if (mode === "idle") {
    return (
      <div className="space-y-5">
        <Button size="lg" className="h-24 w-full text-lg" onClick={() => setMode("scanning")}>
          <Camera className="mr-2 h-6 w-6" aria-hidden />
          Scanner un client
        </Button>

        <Card className="space-y-3">
          <p className="text-sm font-medium">Le client n&apos;a pas sa carte ?</p>
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Téléphone ou prénom"
              aria-label="Rechercher un client"
            />
            <Button variant="outline" onClick={handleSearch} disabled={pending}>
              Chercher
            </Button>
          </div>
          {error ? <Alert variant="error">{error}</Alert> : null}
        </Card>
      </div>
    );
  }

  if (mode === "scanning") {
    return (
      <div className="space-y-4">
        <QrReader onToken={handleToken} onError={(message) => setError(message)} />
        {error ? <Alert variant="error">{error}</Alert> : null}
        <Button variant="outline" className="w-full" onClick={reset}>
          <X className="mr-2 h-4 w-4" aria-hidden />
          Annuler
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? <Alert variant="error">{error}</Alert> : null}

      {customer ? (
        <Card className="space-y-4">
          <div>
            <p className="text-2xl font-semibold tracking-[-0.03em]">{customer.firstName}</p>
            <p className="text-sm text-muted-foreground">
              {customer.totalVisits} visite{customer.totalVisits > 1 ? "s" : ""} · Dernière visite :{" "}
              {formatRelativeDays(customer.lastVisitAt)}
            </p>
          </div>

          <div>
            <p className="font-medium">
              {customer.currentPoints} point{customer.currentPoints > 1 ? "s" : ""}
              {upcoming ? (
                <span className="font-normal text-muted-foreground">
                  {" "}
                  · encore {upcoming.pointsCost - customer.currentPoints} pour {upcoming.name}
                </span>
              ) : null}
            </p>

            {/* En mode tampon on dessine les cases jusqu'au palier visé. Au-delà
                de vingt, la rangée devient illisible : on bascule sur la barre. */}
            {customer.mode === "stamp" && goal > 0 && goal <= 20 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Array.from({ length: goal }).map((_, index) => (
                  <span
                    key={index}
                    className={
                      index < customer.currentPoints
                        ? "h-4 w-4 rounded-full bg-accent"
                        : "h-4 w-4 rounded-full border-2 border-border"
                    }
                  />
                ))}
              </div>
            ) : goal > 0 ? (
              <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-500 ease-[var(--ease-out-soft)]"
                  style={{ width: `${Math.min(100, (customer.currentPoints / goal) * 100)}%` }}
                />
              </div>
            ) : null}
          </div>

          {redeemed ? <Alert variant="success">{redeemed}</Alert> : null}

          {/* Catalogue : le client choisit, le commerçant valide. Les paliers
              hors de portée restent visibles — ils donnent envie de revenir. */}
          {tiers.length > 0 ? (
            <div>
              <p className="mb-2 text-sm font-semibold">
                {affordable.length > 0
                  ? `À échanger maintenant (${affordable.length})`
                  : "Catalogue des récompenses"}
              </p>
              <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                {tiers.map((tier) => {
                  const reachable = tier.pointsCost <= customer.currentPoints;
                  return (
                    <li
                      key={tier.id}
                      className="flex items-center justify-between gap-3 px-3.5 py-2.5"
                    >
                      <span className={reachable ? "font-medium" : "text-muted-foreground"}>
                        {tier.name}
                        <span className="ml-2 text-sm text-muted-foreground">
                          {tier.pointsCost} pts
                        </span>
                      </span>
                      <Button
                        size="sm"
                        variant={reachable ? "accent" : "ghost"}
                        disabled={!reachable || pending}
                        onClick={() => handleRedeem(tier.id, tier.pointsCost)}
                      >
                        {reachable ? "Échanger" : `−${tier.pointsCost - customer.currentPoints}`}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <Alert>
              Aucune récompense configurée. Ajoutez-en dans Fidélité, sinon les points de vos
              clients ne servent à rien.
            </Alert>
          )}

          {customer.legacyRewards > 0 ? (
            <Alert variant="success">
              <span className="flex items-start gap-2">
                <Gift className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>
                  {customer.legacyRewards} récompense{customer.legacyRewards > 1 ? "s" : ""} acquise
                  {customer.legacyRewards > 1 ? "s" : ""} avant le passage aux paliers — à remettre
                  depuis l&apos;onglet Récompenses.
                </span>
              </span>
            </Alert>
          ) : null}

          {visit?.duplicate ? (
            <Alert>Visite déjà enregistrée il y a quelques secondes.</Alert>
          ) : null}

          {visit?.result && !visit.duplicate ? (
            <div className="animate-pop rounded-xl border border-accent/15 bg-accent-soft p-5 text-center">
              <p className="flex items-center justify-center gap-2 text-4xl font-semibold tracking-[-0.04em] text-accent">
                <Check className="h-7 w-7" aria-hidden strokeWidth={2.5} />+
                {visit.result.pointsAdded}
              </p>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {visit.result.currentPoints} point{visit.result.currentPoints > 1 ? "s" : ""} au
                total
                {visit.result.nextRewardName && visit.result.nextRewardCost !== null
                  ? ` · encore ${visit.result.nextRewardCost - visit.result.currentPoints} pour ${visit.result.nextRewardName}`
                  : ""}
              </p>
              {visit.result.affordableRewards > 0 ? (
                <p className="mt-3 flex items-center justify-center gap-1.5 font-semibold text-accent">
                  <Gift className="h-4 w-4" aria-hidden />
                  {visit.result.affordableRewards} récompense
                  {visit.result.affordableRewards > 1 ? "s" : ""} à échanger
                </p>
              ) : null}
              {visit.result.referralRewarded ? (
                <p className="mt-3 flex items-center justify-center gap-1.5 text-sm font-medium text-accent">
                  <Users className="h-4 w-4" aria-hidden />
                  Parrainage validé — le parrain a reçu son bonus
                </p>
              ) : null}
              {visit.result.referralNote === "min_amount" ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Bonus de parrainage en attente : achat sous le minimum fixé. Il sera versé au
                  prochain passage qui l&apos;atteint.
                </p>
              ) : null}
              {visit.result.referralNote === "monthly_limit" ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Bonus de parrainage non versé : le parrain a atteint sa limite mensuelle.
                </p>
              ) : null}
            </div>
          ) : null}

          {visit?.error ? <Alert variant="error">{visit.error}</Alert> : null}

          {/* Le montant n'est demandé qu'en mode points : en mode tampon, une
              saisie de plus rallongerait le passage en caisse pour rien. */}
          {customer.mode === "amount" && !visit?.result ? (
            <div>
              <Label htmlFor="amount">Montant de l&apos;achat</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="amount"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  inputMode="decimal"
                  placeholder="45,00"
                  autoFocus
                  className="text-lg"
                />
                <span className="text-lg text-muted-foreground">€</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {customer.pointsPerEuro} point{customer.pointsPerEuro > 1 ? "s" : ""} par euro
                dépensé.
              </p>
            </div>
          ) : null}

          {visit?.result ? (
            <Button size="lg" variant="outline" className="w-full" onClick={reset}>
              Client suivant
            </Button>
          ) : (
            <Button
              size="lg"
              className="h-16 w-full text-lg"
              onClick={handleAddVisit}
              disabled={pending}
            >
              {pending ? "Enregistrement…" : "+1 visite"}
            </Button>
          )}
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-muted-foreground">
            {pending ? "Recherche du client…" : "Aucun client sélectionné."}
          </p>
        </Card>
      )}

      {!visit?.result ? (
        <Button variant="ghost" className="w-full" onClick={reset}>
          Annuler
        </Button>
      ) : null}
    </div>
  );
}

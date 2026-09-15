"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { Camera, X } from "lucide-react";
import {
  addVisitAction,
  lookupCustomerAction,
  searchCustomerAction,
  type AddVisitState,
  type CustomerSummary,
} from "@/actions/visits";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  const [pending, startTransition] = useTransition();

  function reset() {
    setMode("idle");
    setCustomer(null);
    setError(null);
    setVisit(null);
    setQuery("");
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
      const result = await addVisitAction(customer.id);
      setVisit(result);
      if (result.result) {
        setCustomer({
          ...customer,
          currentPoints: result.result.currentPoints,
          totalVisits: result.result.totalVisits,
          availableRewards: customer.availableRewards + result.result.rewardsCreated,
        });
      }
    });
  }

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
            <p className="text-2xl font-bold">{customer.firstName}</p>
            <p className="text-sm text-muted-foreground">
              {customer.totalVisits} visite{customer.totalVisits > 1 ? "s" : ""} · Dernière visite :{" "}
              {formatRelativeDays(customer.lastVisitAt)}
            </p>
          </div>

          <div>
            <p className="font-medium">
              {customer.currentPoints} / {customer.rewardThreshold} points
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {Array.from({ length: customer.rewardThreshold }).map((_, index) => (
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
          </div>

          {customer.availableRewards > 0 ? (
            <Alert variant="success">
              🎁 {customer.availableRewards} récompense{customer.availableRewards > 1 ? "s" : ""}{" "}
              disponible{customer.availableRewards > 1 ? "s" : ""} — {customer.rewardName}
            </Alert>
          ) : null}

          {visit?.duplicate ? (
            <Alert>Visite déjà enregistrée il y a quelques secondes.</Alert>
          ) : null}

          {visit?.result && !visit.duplicate ? (
            <div className="animate-pop rounded-xl bg-muted p-4 text-center">
              <p className="text-3xl font-bold">+1 ⭐</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {visit.result.currentPoints} / {visit.result.rewardThreshold} points
              </p>
              {visit.result.rewardsCreated > 0 ? (
                <p className="mt-2 font-semibold text-green-700">
                  🎉 Nouvelle récompense disponible
                </p>
              ) : null}
            </div>
          ) : null}

          {visit?.error ? <Alert variant="error">{visit.error}</Alert> : null}

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

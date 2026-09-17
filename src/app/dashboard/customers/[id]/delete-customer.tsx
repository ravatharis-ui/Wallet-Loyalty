"use client";

import { useState } from "react";
import { deleteCustomerAction } from "@/actions/customers";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";

export function DeleteCustomer({
  customerId,
  firstName,
}: {
  customerId: string;
  firstName: string;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <Card className="border-danger/25">
      <p className="font-semibold text-danger">Supprimer ce client</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Supprime définitivement {firstName}, ses visites, ses récompenses et son historique
        d&apos;emails. Cette action est irréversible et répond aux demandes de suppression RGPD.
      </p>
      {confirming ? (
        <form action={deleteCustomerAction} className="mt-4 flex items-center gap-2">
          <input type="hidden" name="customerId" value={customerId} />
          <SubmitButton variant="danger" size="sm" pendingText="Suppression…">
            Confirmer la suppression
          </SubmitButton>
          <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
            Annuler
          </Button>
        </form>
      ) : (
        <Button variant="outline" size="sm" className="mt-4" onClick={() => setConfirming(true)}>
          Supprimer les données de ce client
        </Button>
      )}
    </Card>
  );
}

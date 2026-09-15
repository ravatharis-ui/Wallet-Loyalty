"use client";

import { startCheckoutAction, openBillingPortalAction } from "@/actions/subscription";
import { SubmitButton } from "@/components/submit-button";

export function SubscriptionActions({ hasCustomer }: { hasCustomer: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      <form action={startCheckoutAction}>
        <SubmitButton pendingText="Ouverture…">
          {hasCustomer ? "Reprendre l'abonnement" : "Activer l'abonnement"}
        </SubmitButton>
      </form>
      {hasCustomer ? (
        <form action={openBillingPortalAction}>
          <SubmitButton variant="outline" pendingText="Ouverture…">
            Gérer mon abonnement
          </SubmitButton>
        </form>
      ) : null}
    </div>
  );
}

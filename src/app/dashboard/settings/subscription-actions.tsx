"use client";

import { useActionState } from "react";
import {
  startCheckoutAction,
  openBillingPortalAction,
  type SubscriptionState,
} from "@/actions/subscription";
import { SubmitButton } from "@/components/submit-button";
import { Alert } from "@/components/ui/alert";

export function SubscriptionActions({ hasCustomer }: { hasCustomer: boolean }) {
  const [checkout, checkoutAction] = useActionState<SubscriptionState, FormData>(
    startCheckoutAction,
    {},
  );
  const [portal, portalAction] = useActionState<SubscriptionState, FormData>(
    openBillingPortalAction,
    {},
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <form action={checkoutAction}>
          <SubmitButton pendingText="Ouverture…">
            {hasCustomer ? "Reprendre l'abonnement" : "Activer l'abonnement"}
          </SubmitButton>
        </form>
        {hasCustomer ? (
          <form action={portalAction}>
            <SubmitButton variant="outline" pendingText="Ouverture…">
              Gérer mon abonnement
            </SubmitButton>
          </form>
        ) : null}
      </div>

      {checkout.error ? <Alert variant="error">{checkout.error}</Alert> : null}
      {portal.error ? <Alert variant="error">{portal.error}</Alert> : null}
    </div>
  );
}

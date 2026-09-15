"use client";

import { useActionState } from "react";
import {
  startCheckoutAction,
  openBillingPortalAction,
  type SubscriptionState,
} from "@/actions/subscription";
import { SubmitButton } from "@/components/submit-button";
import { Alert } from "@/components/ui/alert";
import {
  PRICE_LABEL,
  PRICE_YEARLY_LABEL,
  PRICE_YEARLY_PER_MONTH_LABEL,
  YEARLY_SAVING_LABEL,
} from "@/lib/pricing";

export function SubscriptionActions({
  hasCustomer,
  yearlyAvailable,
}: {
  hasCustomer: boolean;
  yearlyAvailable: boolean;
}) {
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
      <form action={checkoutAction} className="flex flex-wrap gap-2">
        {/* La formule est portée par le bouton cliqué. */}
        <SubmitButton name="plan" value="monthly" pendingText="Ouverture…">
          {hasCustomer ? "Reprendre" : "S'abonner"} — {PRICE_LABEL} / mois
        </SubmitButton>
        {yearlyAvailable ? (
          <SubmitButton
            name="plan"
            value="yearly"
            variant="accent"
            pendingText="Ouverture…"
            title={`${PRICE_YEARLY_PER_MONTH_LABEL} par mois, payés en une fois`}
          >
            {PRICE_YEARLY_LABEL} / an — économisez {YEARLY_SAVING_LABEL}
          </SubmitButton>
        ) : null}
      </form>

      <div className="flex flex-wrap gap-2">
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

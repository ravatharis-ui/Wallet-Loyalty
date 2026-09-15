"use client";

import { useActionState, useState } from "react";
import { redeemRewardAction, type RedeemState } from "@/actions/rewards";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";

export function RedeemButton({ rewardId }: { rewardId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction] = useActionState<RedeemState, FormData>(redeemRewardAction, {});

  if (state.error) {
    return <p className="text-sm text-danger">{state.error}</p>;
  }

  if (!confirming) {
    return (
      <Button size="sm" onClick={() => setConfirming(true)}>
        Utiliser la récompense
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="rewardId" value={rewardId} />
      <span className="text-sm">Confirmer ?</span>
      <SubmitButton size="sm" variant="accent" pendingText="…">
        Oui
      </SubmitButton>
      <Button size="sm" variant="ghost" type="button" onClick={() => setConfirming(false)}>
        Non
      </Button>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { recoverCardAction, type RecoverState } from "@/actions/recover-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/submit-button";

export function RecoverForm({ slug }: { slug: string }) {
  const [state, formAction] = useActionState<RecoverState, FormData>(recoverCardAction, {});

  if (state.success) {
    return (
      <div className="mt-6">
        <Alert variant="success">{state.success}</Alert>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="businessSlug" value={slug} />
      <div>
        <Label htmlFor="phone">Téléphone</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="06 12 34 56 78"
          required
        />
      </div>
      {state.error ? <Alert variant="error">{state.error}</Alert> : null}
      <SubmitButton size="lg" className="w-full" pendingText="Envoi…">
        Recevoir le lien par email
      </SubmitButton>
    </form>
  );
}

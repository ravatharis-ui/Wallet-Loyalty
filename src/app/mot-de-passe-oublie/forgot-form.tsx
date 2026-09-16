"use client";

import { useActionState } from "react";
import { forgotPasswordAction, type ActionState } from "@/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/submit-button";

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(forgotPasswordAction, {});

  if (state.success) {
    return (
      <div className="mt-6">
        <Alert variant="success">{state.success}</Alert>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      {state.error ? <Alert variant="error">{state.error}</Alert> : null}
      <SubmitButton className="w-full" size="lg" pendingText="Envoi…">
        Recevoir le lien
      </SubmitButton>
    </form>
  );
}

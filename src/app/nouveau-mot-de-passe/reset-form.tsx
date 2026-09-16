"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPasswordAction, type ActionState } from "@/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/submit-button";

export function ResetPasswordForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(resetPasswordAction, {});

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <div>
        <Label htmlFor="password">Nouveau mot de passe</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <div>
        <Label htmlFor="confirmation">Confirmer</Label>
        <Input
          id="confirmation"
          name="confirmation"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>

      {state.error ? (
        <Alert variant="error">
          {state.error}{" "}
          <Link href="/mot-de-passe-oublie" className="underline">
            Demander un nouveau lien
          </Link>
        </Alert>
      ) : null}

      <SubmitButton className="w-full" size="lg" pendingText="Enregistrement…">
        Enregistrer
      </SubmitButton>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signupAction, type ActionState } from "@/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/submit-button";

export function SignupForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(signupAction, {});

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <div>
        <Label htmlFor="businessName">Nom de votre commerce</Label>
        <Input id="businessName" name="businessName" required placeholder="Café des Amis" />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div>
        <Label htmlFor="password">Mot de passe</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <p className="mt-1 text-xs text-muted-foreground">8 caractères minimum.</p>
      </div>
      {state.error ? <Alert variant="error">{state.error}</Alert> : null}
      {state.success ? <Alert variant="success">{state.success}</Alert> : null}
      <SubmitButton className="w-full" size="lg" pendingText="Création…">
        Créer mon compte
      </SubmitButton>
      <p className="text-xs text-muted-foreground">
        En créant un compte vous acceptez les{" "}
        <Link href="/legal/conditions" className="underline">
          conditions d&apos;utilisation
        </Link>{" "}
        et la{" "}
        <Link href="/legal/confidentialite" className="underline">
          politique de confidentialité
        </Link>
        .
      </p>
    </form>
  );
}

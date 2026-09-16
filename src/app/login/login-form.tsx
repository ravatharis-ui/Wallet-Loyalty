"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { loginAction, logoutAction, type ActionState } from "@/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/submit-button";

export function LoginForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(loginAction, {});
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const sessionError = searchParams.get("error");

  // Session orpheline : l'utilisateur existe encore, mais son commerce a été
  // supprimé. Se reconnecter n'y changerait rien, il faut clore la session.
  if (sessionError) {
    return (
      <div className="mt-6 space-y-4">
        <Alert variant="error">
          {sessionError === "commerce-introuvable"
            ? "Le commerce associé à ce compte n'existe plus."
            : "Aucun commerce n'est associé à ce compte."}{" "}
          Déconnectez-vous, puis créez un nouveau compte.
        </Alert>
        <form action={logoutAction}>
          <SubmitButton className="w-full" size="lg" pendingText="Déconnexion…">
            Se déconnecter
          </SubmitButton>
        </form>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="next" value={next} />
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
          autoComplete="current-password"
          required
        />
      </div>
      {state.error ? <Alert variant="error">{state.error}</Alert> : null}
      <SubmitButton className="w-full" size="lg" pendingText="Connexion…">
        Se connecter
      </SubmitButton>
      <p className="text-center text-sm">
        <Link href="/mot-de-passe-oublie" className="text-muted-foreground underline">
          Mot de passe oublié ?
        </Link>
      </p>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import Link from "next/link";
import { joinAction, type JoinState } from "@/actions/join";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/submit-button";

export function JoinForm({ slug }: { slug: string }) {
  const [state, formAction] = useActionState<JoinState, FormData>(joinAction, {});

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <input type="hidden" name="businessSlug" value={slug} />
      <div>
        <Label htmlFor="firstName">Prénom *</Label>
        <Input id="firstName" name="firstName" autoComplete="given-name" required />
      </div>
      <div>
        <Label htmlFor="phone">Téléphone *</Label>
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
      <div>
        <Label htmlFor="email">Email *</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
        <p className="mt-1 text-xs text-muted-foreground">
          Pour être prévenu de vos récompenses et retrouver votre carte si vous perdez le lien.
        </p>
      </div>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="consent"
          value="on"
          required
          className="mt-0.5 h-5 w-5 shrink-0 rounded border-border"
        />
        <span>
          J&apos;accepte les{" "}
          <Link href="/legal/conditions" className="underline">
            conditions d&apos;utilisation
          </Link>{" "}
          et la{" "}
          <Link href="/legal/confidentialite" className="underline">
            politique de confidentialité
          </Link>
          .
        </span>
      </label>

      {state.error ? <Alert variant="error">{state.error}</Alert> : null}

      <SubmitButton size="lg" className="w-full" pendingText="Création…">
        Créer ma carte
      </SubmitButton>
    </form>
  );
}

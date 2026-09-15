"use client";

import { useActionState } from "react";
import { saveBusinessAction, type BusinessState } from "@/actions/business";
import type { Business } from "@/lib/db.types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/submit-button";

export function BusinessForm({ business }: { business: Business }) {
  const [state, formAction] = useActionState<BusinessState, FormData>(saveBusinessAction, {});

  return (
    <form action={formAction}>
      <Card className="space-y-4">
        <div>
          <Label htmlFor="name">Nom du commerce</Label>
          <Input id="name" name="name" defaultValue={business.name} required />
        </div>
        <div>
          <Label htmlFor="phone">Téléphone</Label>
          <Input id="phone" name="phone" type="tel" defaultValue={business.phone ?? ""} />
        </div>
        <div>
          <Label htmlFor="email">Email de contact</Label>
          <Input id="email" name="email" type="email" defaultValue={business.email ?? ""} />
        </div>
        <p className="text-xs text-muted-foreground">
          Identifiant public : <code>/join/{business.slug}</code> — non modifiable pour que vos QR
          codes imprimés restent valides.
        </p>

        {state.error ? <Alert variant="error">{state.error}</Alert> : null}
        {state.success ? <Alert variant="success">{state.success}</Alert> : null}

        <SubmitButton pendingText="Enregistrement…">Enregistrer</SubmitButton>
      </Card>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { uploadLogoAction, removeLogoAction, type BusinessState } from "@/actions/business";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/submit-button";

export function LogoForm({ logoUrl }: { logoUrl: string | null }) {
  const [upload, uploadAction] = useActionState<BusinessState, FormData>(uploadLogoAction, {});
  const [remove, removeAction] = useActionState<BusinessState, FormData>(removeLogoAction, {});

  return (
    <Card className="space-y-4">
      {logoUrl ? (
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- image externe hébergée par Supabase */}
          <img
            src={logoUrl}
            alt="Logo actuel de votre commerce"
            className="h-20 w-20 rounded-2xl border border-border object-cover"
          />
          <form action={removeAction}>
            <SubmitButton variant="outline" size="sm" pendingText="Suppression…">
              Supprimer le logo
            </SubmitButton>
          </form>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Aucun logo. Il apparaîtra sur la carte de vos clients et sur votre page
          d&apos;inscription.
        </p>
      )}

      <form action={uploadAction} className="space-y-3">
        <div>
          <Label htmlFor="logo">{logoUrl ? "Remplacer le logo" : "Ajouter un logo"}</Label>
          <input
            id="logo"
            name="logo"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            required
            className="block w-full text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-muted file:px-4 file:py-2 file:text-sm file:font-medium"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            PNG, JPEG ou WebP, 1 Mo maximum. Une image carrée rend le mieux.
          </p>
        </div>

        {upload.error ? <Alert variant="error">{upload.error}</Alert> : null}
        {upload.success ? <Alert variant="success">{upload.success}</Alert> : null}
        {remove.error ? <Alert variant="error">{remove.error}</Alert> : null}
        {remove.success ? <Alert variant="success">{remove.success}</Alert> : null}

        <SubmitButton pendingText="Envoi…">Enregistrer le logo</SubmitButton>
      </form>
    </Card>
  );
}

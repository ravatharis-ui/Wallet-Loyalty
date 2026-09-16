"use client";

import { useActionState } from "react";
import Link from "next/link";
import { importCustomersAction, type ImportState } from "@/actions/import-customers";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/submit-button";

export function ImportForm({ disabled }: { disabled: boolean }) {
  const [state, formAction] = useActionState<ImportState, FormData>(importCustomersAction, {});

  if (state.imported !== undefined) {
    return (
      <Card className="space-y-3">
        <Alert variant="success">
          <strong>
            {state.imported} client{state.imported > 1 ? "s" : ""} importé
            {state.imported > 1 ? "s" : ""}.
          </strong>
        </Alert>

        {state.duplicates ? (
          <p className="text-sm text-muted-foreground">
            {state.duplicates} déjà enregistré{state.duplicates > 1 ? "s" : ""} — ignoré
            {state.duplicates > 1 ? "s" : ""}, leurs points actuels sont conservés.
          </p>
        ) : null}

        {state.errors && state.errors.length > 0 ? (
          <div>
            <p className="text-sm font-medium">
              {state.skipped} ligne{(state.skipped ?? 0) > 1 ? "s" : ""} non importée
              {(state.skipped ?? 0) > 1 ? "s" : ""}
            </p>
            <ul className="mt-1 space-y-0.5 text-sm text-muted-foreground">
              {state.errors.map((rowError) => (
                <li key={rowError.line}>
                  Ligne {rowError.line} : {rowError.reason}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-muted-foreground">
              Corrigez ces lignes dans votre fichier et relancez un import : les clients déjà
              importés ne seront pas dupliqués.
            </p>
          </div>
        ) : null}

        <Link href="/dashboard/customers" className="text-sm font-medium text-accent underline">
          Voir mes clients
        </Link>
      </Card>
    );
  }

  return (
    <form action={formAction}>
      <Card className="space-y-4">
        <div>
          <Label htmlFor="file">Votre fichier CSV</Label>
          <input
            id="file"
            name="file"
            type="file"
            accept=".csv,text/csv,text/plain"
            required
            disabled={disabled}
            className="block w-full text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-muted file:px-4 file:py-2 file:text-sm file:font-medium"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            500 Ko maximum, 2000 clients par import.
          </p>
        </div>

        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="consent"
            value="on"
            required
            disabled={disabled}
            className="mt-0.5 h-5 w-5 shrink-0 rounded border-border"
          />
          <span>
            Je confirme que ces clients m&apos;ont communiqué leurs coordonnées et acceptent
            d&apos;être enregistrés dans mon programme de fidélité.
          </span>
        </label>

        {state.error ? <Alert variant="error">{state.error}</Alert> : null}

        {state.errors && state.errors.length > 0 && state.imported === undefined ? (
          <ul className="space-y-0.5 text-sm text-muted-foreground">
            {state.errors.map((rowError) => (
              <li key={rowError.line}>
                Ligne {rowError.line} : {rowError.reason}
              </li>
            ))}
          </ul>
        ) : null}

        <SubmitButton size="lg" pendingText="Import en cours…" disabled={disabled}>
          Importer mes clients
        </SubmitButton>
      </Card>
    </form>
  );
}

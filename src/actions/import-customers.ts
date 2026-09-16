"use server";

import { revalidatePath } from "next/cache";
import { requireMerchant } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  previewImport,
  IMPORT_MAX_BYTES,
  IMPORT_MAX_ROWS,
  type ImportRowError,
} from "@/lib/customer-import";
import { canCreateCustomer } from "@/lib/loyalty";
import type { Customer } from "@/lib/db.types";

export interface ImportState {
  error?: string;
  imported?: number;
  skipped?: number;
  duplicates?: number;
  errors?: ImportRowError[];
}

/**
 * Import d'un fichier client existant.
 *
 * Aucun email n'est envoyé : ces clients n'ont rien demandé aujourd'hui, et leur
 * écrire sans prévenir abîmerait la réputation d'envoi du domaine — la même qui
 * fait arriver les relances. Ils recevront la carte à leur prochain passage,
 * ou par le renvoi de lien.
 */
export async function importCustomersAction(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const session = await requireMerchant();

  if (formData.get("consent") !== "on") {
    return { error: "Confirmez que ces clients ont accepté d'être enregistrés." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choisissez un fichier CSV." };
  }
  if (file.size > IMPORT_MAX_BYTES) {
    return { error: "Fichier trop lourd : 500 Ko maximum." };
  }

  const preview = previewImport(await file.text());

  if (preview.customers.length === 0) {
    return {
      error:
        preview.errors[0]?.reason ??
        "Aucun client valide dans ce fichier. Vérifiez les colonnes « prénom » et « téléphone ».",
      errors: preview.errors.slice(0, 20),
    };
  }
  if (preview.customers.length > IMPORT_MAX_ROWS) {
    return { error: `Fichier trop long : ${IMPORT_MAX_ROWS} clients maximum par import.` };
  }

  const admin = createSupabaseAdminClient();

  // Le palier gratuit s'applique aussi à l'import : sinon il suffirait d'un
  // fichier pour contourner la limite de trois cartes.
  const { count } = await admin
    .from("customers")
    .select("id", { count: "exact", head: true })
    .eq("business_id", session.businessId);

  const existingCount = count ?? 0;
  const limit = session.access.customerLimit;

  if (!canCreateCustomer(session.access, existingCount)) {
    return {
      error:
        limit === 0
          ? "Votre abonnement a expiré : réactivez-le pour importer des clients."
          : `Le mode découverte est limité à ${limit} cartes. Passez en illimité pour importer votre fichier.`,
    };
  }
  if (limit !== null && existingCount + preview.customers.length > limit) {
    return {
      error: `Ce fichier contient ${preview.customers.length} clients, et le mode découverte est limité à ${limit} cartes. Passez en illimité pour l'importer.`,
    };
  }

  // Les clients déjà présents ne sont pas réimportés : leurs points actuels
  // font foi, pas ceux d'un fichier exporté il y a une semaine.
  const { data: existing } = await admin
    .from("customers")
    .select("phone")
    .eq("business_id", session.businessId)
    .returns<Pick<Customer, "phone">[]>();

  const known = new Set((existing ?? []).map((row) => row.phone.replace(/[^0-9+]/g, "")));

  const rows = preview.customers.filter(
    (customer) => !known.has(customer.phone.replace(/[^0-9+]/g, "")),
  );
  const alreadyKnown = preview.customers.length - rows.length;

  if (rows.length === 0) {
    return {
      error: "Tous les clients de ce fichier sont déjà enregistrés.",
      duplicates: preview.duplicates + alreadyKnown,
    };
  }

  const { error, count: inserted } = await admin.from("customers").insert(
    rows.map((customer) => ({
      business_id: session.businessId,
      first_name: customer.firstName,
      phone: customer.phone,
      email: customer.email,
      total_visits: customer.totalVisits,
      current_points: customer.currentPoints,
    })),
    { count: "exact" },
  );

  if (error) {
    return { error: "Import impossible. Vérifiez le fichier et réessayez." };
  }

  revalidatePath("/dashboard/customers");
  revalidatePath("/dashboard");

  return {
    imported: inserted ?? rows.length,
    skipped: preview.errors.length,
    duplicates: preview.duplicates + alreadyKnown,
    errors: preview.errors.slice(0, 20),
  };
}

/**
 * Conversion d'un fichier client en lignes importables.
 * Fonctions pures : un import silencieusement faux serait pire que pas d'import.
 */

import { parseCsv } from "@/lib/csv";

/** Bornes de l'import, partagées entre l'action serveur et le formulaire. */
export const IMPORT_MAX_BYTES = 512 * 1024;
export const IMPORT_MAX_ROWS = 2000;

export interface ImportedCustomer {
  firstName: string;
  phone: string;
  email: string | null;
  totalVisits: number;
  currentPoints: number;
}

export interface ImportRowError {
  line: number;
  reason: string;
}

export interface ImportPreview {
  customers: ImportedCustomer[];
  errors: ImportRowError[];
  /** Doublons de téléphone à l'intérieur du fichier lui-même. */
  duplicates: number;
}

/** Colonnes reconnues, quelle que soit l'orthographe ou l'accentuation. */
const COLUMNS: Record<keyof ImportedCustomer, string[]> = {
  firstName: ["prenom", "prénom", "firstname", "first_name", "nom", "client"],
  phone: [
    "telephone",
    "téléphone",
    "tel",
    "tél",
    "phone",
    "mobile",
    "portable",
    "numero",
    "numéro",
  ],
  email: ["email", "e-mail", "mail", "courriel", "adresse email"],
  totalVisits: ["visites", "visite", "visits", "passages", "nombre de visites"],
  currentPoints: ["points", "point", "solde", "tampons", "cagnotte"],
};

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/** Associe chaque colonne attendue à son indice dans l'en-tête. */
export function mapHeaders(header: string[]): Partial<Record<keyof ImportedCustomer, number>> {
  const mapping: Partial<Record<keyof ImportedCustomer, number>> = {};

  header.forEach((raw, index) => {
    const value = normalize(raw);
    for (const [field, aliases] of Object.entries(COLUMNS) as [
      keyof ImportedCustomer,
      string[],
    ][]) {
      if (mapping[field] === undefined && aliases.some((alias) => normalize(alias) === value)) {
        mapping[field] = index;
      }
    }
  });

  return mapping;
}

function parseCount(value: string | undefined): number {
  if (!value) return 0;
  const amount = Number(value.replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.min(100_000, Math.trunc(amount));
}

const PHONE = /^[+0-9][0-9 .\-()]{4,}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Analyse le fichier et retourne les clients importables, les lignes rejetées
 * et leur motif. Rien n'est deviné : une ligne douteuse est signalée, pas
 * corrigée en silence.
 */
export function previewImport(content: string): ImportPreview {
  const rows = parseCsv(content);
  const errors: ImportRowError[] = [];

  if (rows.length === 0) {
    return { customers: [], errors: [{ line: 0, reason: "Fichier vide" }], duplicates: 0 };
  }

  const mapping = mapHeaders(rows[0]);

  if (mapping.firstName === undefined || mapping.phone === undefined) {
    return {
      customers: [],
      errors: [
        {
          line: 1,
          reason:
            "Colonnes « prénom » et « téléphone » introuvables. Vérifiez la première ligne du fichier.",
        },
      ],
      duplicates: 0,
    };
  }

  const customers: ImportedCustomer[] = [];
  const seen = new Set<string>();
  let duplicates = 0;

  for (let index = 1; index < rows.length; index++) {
    const row = rows[index];
    const line = index + 1;

    const firstName = (row[mapping.firstName] ?? "").trim();
    const phone = (row[mapping.phone] ?? "").trim();
    const email = mapping.email !== undefined ? (row[mapping.email] ?? "").trim() : "";

    if (!firstName) {
      errors.push({ line, reason: "Prénom manquant" });
      continue;
    }
    if (!PHONE.test(phone)) {
      errors.push({ line, reason: `Téléphone invalide : « ${phone || "vide"} »` });
      continue;
    }
    if (email && !EMAIL.test(email)) {
      errors.push({ line, reason: `Email invalide : « ${email} »` });
      continue;
    }

    const key = phone.replace(/[^0-9+]/g, "");
    if (seen.has(key)) {
      duplicates += 1;
      continue;
    }
    seen.add(key);

    customers.push({
      firstName: firstName.slice(0, 60),
      phone: phone.slice(0, 30),
      email: email ? email.toLowerCase() : null,
      totalVisits: parseCount(
        mapping.totalVisits !== undefined ? row[mapping.totalVisits] : undefined,
      ),
      currentPoints: parseCount(
        mapping.currentPoints !== undefined ? row[mapping.currentPoints] : undefined,
      ),
    });
  }

  return { customers, errors, duplicates };
}

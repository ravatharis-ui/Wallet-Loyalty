/**
 * Analyse d'un fichier CSV — sans dépendance, et surtout sans surprise.
 *
 * Les fichiers viennent d'Excel ou de Google Sheets en version française : le
 * séparateur est le plus souvent un point-virgule, parfois une virgule ou une
 * tabulation. On le détecte plutôt que de l'imposer.
 */

const DELIMITERS = [";", ",", "\t"] as const;

/** Séparateur le plus fréquent sur la première ligne non vide. */
export function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim() !== "") ?? "";
  let best = ";";
  let bestCount = 0;

  for (const delimiter of DELIMITERS) {
    // Les séparateurs entre guillemets ne comptent pas.
    let count = 0;
    let inQuotes = false;
    for (const char of firstLine) {
      if (char === '"') inQuotes = !inQuotes;
      else if (char === delimiter && !inQuotes) count += 1;
    }
    if (count > bestCount) {
      best = delimiter;
      bestCount = count;
    }
  }

  return best;
}

/**
 * Découpe un CSV en lignes de cellules.
 * Gère les guillemets, les guillemets échappés (`""`) et les retours à la ligne
 * à l'intérieur d'une cellule.
 */
export function parseCsv(input: string, delimiter = detectDelimiter(input)): string[][] {
  // Le BOM d'Excel se retrouverait collé au premier en-tête.
  const text = input.replace(/^﻿/, "");

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index++) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(cell.trim());
      cell = "";
    } else if (char === "\n") {
      row.push(cell.trim());
      cell = "";
      rows.push(row);
      row = [];
    } else if (char !== "\r") {
      cell += char;
    }
  }

  row.push(cell.trim());
  rows.push(row);

  // Une ligne vide en fin de fichier est la norme, pas une donnée.
  return rows.filter((line) => line.some((value) => value !== ""));
}

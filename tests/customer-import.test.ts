import { describe, it, expect } from "vitest";
import { parseCsv, detectDelimiter } from "@/lib/csv";
import { previewImport, mapHeaders } from "@/lib/customer-import";

describe("analyse CSV", () => {
  it("détecte le point-virgule des exports Excel français", () => {
    expect(detectDelimiter("Prénom;Téléphone\nLéa;0612345678")).toBe(";");
    expect(detectDelimiter("Prénom,Téléphone\nLéa,0612345678")).toBe(",");
    expect(detectDelimiter("Prénom\tTéléphone\nLéa\t0612345678")).toBe("\t");
  });

  it("gère les guillemets et les séparateurs qu'ils protègent", () => {
    const rows = parseCsv('Nom;Ville\n"Durand; Léa";"Saint-André"');
    expect(rows[1]).toEqual(["Durand; Léa", "Saint-André"]);
  });

  it("gère les guillemets échappés", () => {
    expect(parseCsv('A\n"Il a dit ""oui"""')[1]).toEqual(['Il a dit "oui"']);
  });

  it("retire le BOM d'Excel collé au premier en-tête", () => {
    const rows = parseCsv("﻿Prénom;Téléphone\nLéa;0612345678");
    expect(rows[0][0]).toBe("Prénom");
  });

  it("ignore les lignes vides de fin de fichier", () => {
    expect(parseCsv("A;B\n1;2\n\n\n")).toHaveLength(2);
  });
});

describe("reconnaissance des colonnes", () => {
  it("accepte les variantes d'orthographe et d'accentuation", () => {
    expect(mapHeaders(["Prénom", "Téléphone", "E-mail"])).toEqual({
      firstName: 0,
      phone: 1,
      email: 2,
    });
    expect(mapHeaders(["prenom", "TEL", "mail", "Visites", "Points"])).toEqual({
      firstName: 0,
      phone: 1,
      email: 2,
      totalVisits: 3,
      currentPoints: 4,
    });
  });
});

describe("préparation de l'import", () => {
  it("importe un fichier correct avec visites et points", () => {
    const result = previewImport(
      "Prénom;Téléphone;Email;Visites;Points\nLéa;06 12 34 56 78;LEA@Example.com;7;7",
    );
    expect(result.errors).toHaveLength(0);
    expect(result.customers).toEqual([
      {
        firstName: "Léa",
        phone: "06 12 34 56 78",
        email: "lea@example.com",
        totalVisits: 7,
        currentPoints: 7,
      },
    ]);
  });

  it("accepte un fichier sans email ni historique", () => {
    const result = previewImport("Prénom;Téléphone\nMarc;0612345678");
    expect(result.customers[0]).toMatchObject({ email: null, totalVisits: 0, currentPoints: 0 });
  });

  it("refuse le fichier si les colonnes obligatoires manquent", () => {
    const result = previewImport("Client;Ville\nLéa;Saint-André");
    expect(result.customers).toHaveLength(0);
    expect(result.errors[0].reason).toContain("introuvables");
  });

  it("signale chaque ligne fautive avec son numéro, sans la corriger", () => {
    const result = previewImport(
      "Prénom;Téléphone;Email\n;0612345678;\nMarc;abc;\nJulie;0612345679;pas-un-email\nLéa;0612345670;",
    );
    expect(result.customers).toHaveLength(1);
    expect(result.errors).toEqual([
      { line: 2, reason: "Prénom manquant" },
      { line: 3, reason: "Téléphone invalide : « abc »" },
      { line: 4, reason: "Email invalide : « pas-un-email »" },
    ]);
  });

  it("ignore les doublons de téléphone à l'intérieur du fichier", () => {
    // Le même numéro écrit différemment reste le même client.
    const result = previewImport(
      "Prénom;Téléphone\nLéa;06 12 34 56 78\nLéa;0612345678\nMarc;0600000000",
    );
    expect(result.customers).toHaveLength(2);
    expect(result.duplicates).toBe(1);
  });

  it("borne les compteurs aberrants plutôt que de les propager", () => {
    const result = previewImport("Prénom;Téléphone;Visites\nLéa;0612345678;-5");
    expect(result.customers[0].totalVisits).toBe(0);
  });

  it("gère un fichier vide", () => {
    expect(previewImport("").customers).toHaveLength(0);
  });
});

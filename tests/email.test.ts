import { describe, it, expect } from "vitest";
import {
  inactive30Email,
  inactive60Email,
  rewardAvailableEmail,
  campaignEmail,
  welcomeEmail,
  cardRecoveryEmail,
  personalise,
} from "@/lib/email/templates";
import { buildFrom } from "@/lib/email/send";

const ctx = {
  businessName: "Café des Amis",
  firstName: "Julie",
  cardUrl: "https://fidelia.app/card/abc",
};

describe("templates email", () => {
  it("personnalise la relance 30 jours", () => {
    const email = inactive30Email(ctx);
    expect(email.subject).toContain("Café des Amis");
    expect(email.html).toContain("Julie");
    expect(email.html).toContain(ctx.cardUrl);
    expect(email.text).toContain(ctx.cardUrl);
  });

  it("personnalise la relance 60 jours", () => {
    const email = inactive60Email(ctx);
    expect(email.html).toContain("Julie");
    expect(email.html).toContain(ctx.cardUrl);
  });

  it("annonce la récompense", () => {
    const email = rewardAvailableEmail({ ...ctx, rewardName: "1 café offert" });
    expect(email.subject).toBe("Votre récompense vous attend 🎁");
    expect(email.html).toContain("1 café offert");
  });

  it("échappe le HTML fourni par le commerçant", () => {
    const email = campaignEmail({ ...ctx, message: "<script>alert(1)</script>" });
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
  });

  it("conserve les paragraphes d'une campagne", () => {
    const email = campaignEmail({ ...ctx, message: "Ligne 1\n\nLigne 2" });
    expect(email.html).toContain("Ligne 1");
    expect(email.html).toContain("Ligne 2");
  });
});

describe("expéditeur des emails", () => {
  const from = "Fidelia <fidelite@fidelia.fr>";

  it("affiche le nom du commerce, sur notre adresse vérifiée", () => {
    expect(buildFrom(from, "Café des Amis")).toBe("Café des Amis <fidelite@fidelia.fr>");
  });

  it("accepte un EMAIL_FROM réduit à une adresse", () => {
    expect(buildFrom("fidelite@fidelia.fr", "Café des Amis")).toBe(
      "Café des Amis <fidelite@fidelia.fr>",
    );
  });

  it("conserve l'expéditeur par défaut sans nom de commerce", () => {
    expect(buildFrom(from, null)).toBe(from);
    expect(buildFrom(from, "   ")).toBe(from);
  });

  it("neutralise une tentative d'injection d'en-tête", () => {
    // Un commerçant contrôle le nom de son commerce : il ne doit jamais
    // pouvoir ajouter un en-tête (Bcc) ni casser le format de l'adresse.
    const injected = buildFrom(from, 'Café"\r\nBcc: victime@exemple.fr');
    expect(injected).not.toContain("\n");
    expect(injected).not.toContain("\r");
    expect(injected).toBe("Café Bcc: victime@exemple.fr <fidelite@fidelia.fr>");
  });

  it("tronque un nom de commerce anormalement long", () => {
    const result = buildFrom(from, "A".repeat(200));
    expect(result.length).toBeLessThan(100);
  });

  it("ignore un EMAIL_FROM sans adresse valide", () => {
    expect(buildFrom("pas-une-adresse", "Café des Amis")).toBe("pas-une-adresse");
  });
});

describe("remise de la carte au client", () => {
  const ctx = {
    businessName: "Café des Amis",
    firstName: "Julie",
    cardUrl: "https://fidelia.app/card/abc",
  };

  it("l'email de bienvenue porte le lien et rappelle de le conserver", () => {
    const email = welcomeEmail({ ...ctx, rewardLine: "10 visites = 1 café offert" });
    expect(email.subject).toContain("Café des Amis");
    expect(email.html).toContain(ctx.cardUrl);
    expect(email.text).toContain(ctx.cardUrl);
    expect(email.html).toContain("Conservez cet email");
    expect(email.html).toContain("10 visites = 1 café offert");
  });

  it("s'adapte à un commerce sans programme actif", () => {
    const email = welcomeEmail({ ...ctx, rewardLine: null });
    expect(email.html).toContain(ctx.cardUrl);
    expect(email.html).not.toContain("undefined");
    expect(email.text).not.toContain("undefined");
  });

  it("le renvoi de carte contient le lien", () => {
    const email = cardRecoveryEmail(ctx);
    expect(email.html).toContain(ctx.cardUrl);
    expect(email.text).toContain(ctx.cardUrl);
  });

  it("échappe le nom du commerce dans les deux emails", () => {
    const hostile = { ...ctx, businessName: "<script>alert(1)</script>" };
    expect(welcomeEmail({ ...hostile, rewardLine: null }).html).not.toContain("<script>");
    expect(cardRecoveryEmail(hostile).html).not.toContain("<script>");
  });
});

describe("campagne personnalisée", () => {
  const ctx = {
    businessName: "HERA",
    firstName: "Léa",
    cardUrl: "https://fidelia.re/card/abc",
  };

  it("remplace {prenom} dans le message et dans l'objet", () => {
    const rendered = campaignEmail({
      ...ctx,
      subject: "{prenom}, une surprise vous attend",
      message: "Bonjour {prenom}, venez découvrir la collection.",
    });
    expect(rendered.subject).toBe("Léa, une surprise vous attend");
    expect(rendered.html).toContain("Bonjour Léa");
    expect(rendered.text).toContain("Bonjour Léa");
    expect(rendered.html).not.toContain("{prenom}");
  });

  it("n'ajoute pas de salut par-dessus celui du commerçant", () => {
    // Le gabarit imposait « Bonjour {prénom}, » : un commerçant qui écrivait le
    // sien obtenait la même phrase deux fois.
    const rendered = campaignEmail({
      ...ctx,
      message: "Bonjour {prenom}, venez voir la collection.",
    });
    const occurrences = rendered.html.split("Bonjour Léa").length - 1;
    expect(occurrences).toBe(1);
  });

  it("accepte la variable quelle que soit la casse", () => {
    expect(personalise("Bonjour {PRENOM} !", "Marc")).toBe("Bonjour Marc !");
    expect(personalise("Bonjour {Prenom}", "Marc")).toBe("Bonjour Marc");
  });

  it("retombe sur un objet neutre quand le commerçant n'en met pas", () => {
    const rendered = campaignEmail({ ...ctx, message: "Un mot rapide." });
    expect(rendered.subject).toBe("Un message de HERA");
  });

  it("insère la photo avant le texte quand il y en a une", () => {
    const rendered = campaignEmail({
      ...ctx,
      message: "Nouvelle collection.",
      imageUrl: "https://example.com/photo.jpg",
    });
    const imageAt = rendered.html.indexOf("photo.jpg");
    const textAt = rendered.html.indexOf("Nouvelle collection.");
    expect(imageAt).toBeGreaterThan(-1);
    expect(imageAt).toBeLessThan(textAt);
  });

  it("échappe une adresse d'image malveillante", () => {
    const rendered = campaignEmail({
      ...ctx,
      message: "Coucou.",
      imageUrl: 'https://x.test/a.jpg" onerror="alert(1)',
    });
    expect(rendered.html).not.toContain('onerror="alert(1)"');
    expect(rendered.html).toContain("&quot;");
  });
});

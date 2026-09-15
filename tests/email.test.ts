import { describe, it, expect } from "vitest";
import {
  inactive30Email,
  inactive60Email,
  rewardAvailableEmail,
  campaignEmail,
} from "@/lib/email/templates";

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

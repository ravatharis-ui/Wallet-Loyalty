/**
 * Templates email — HTML responsive simple, sans dépendance.
 * Chaque email rappelle le commerce, le prénom du client et un lien vers sa carte.
 */

export interface EmailContext {
  businessName: string;
  firstName: string;
  cardUrl: string;
}

function layout(content: string, ctx: EmailContext): string {
  return `<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:24px;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#0b0f19;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;">
      <tr><td>
        <p style="margin:0 0 24px;font-size:14px;color:#5b6475;">${escapeHtml(ctx.businessName)}</p>
        ${content}
        <p style="margin:32px 0 0;">
          <a href="${ctx.cardUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:12px;font-weight:600;">
            Voir ma carte de fidélité
          </a>
        </p>
        <p style="margin:24px 0 0;font-size:12px;color:#8a93a5;">
          Vous recevez cet email car vous êtes membre du programme de fidélité de
          ${escapeHtml(ctx.businessName)}. Pour ne plus recevoir ces messages ou supprimer vos
          données, répondez à cet email.
        </p>
      </td></tr>
    </table>
  </body>
</html>`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export function welcomeEmail(ctx: EmailContext & { rewardLine: string | null }): RenderedEmail {
  const subject = `Votre carte de fidélité ${ctx.businessName} 🎉`;
  const reward = ctx.rewardLine ? `\n${ctx.rewardLine}\n` : "";
  const text = `Bienvenue ${ctx.firstName} !

Votre carte de fidélité ${ctx.businessName} est prête.
${reward}
Conservez cet email : le lien ci-dessous est le seul moyen de retrouver votre carte
et vos points. Vous pouvez aussi l'ajouter à l'écran d'accueil de votre téléphone.

Votre carte : ${ctx.cardUrl}

À bientôt !`;

  return {
    subject,
    text,
    html: layout(
      `<h1 style="margin:0 0 16px;font-size:22px;">Bienvenue ${escapeHtml(ctx.firstName)} ! 🎉</h1>
       <p style="margin:0 0 12px;line-height:1.6;">Votre carte de fidélité <strong>${escapeHtml(ctx.businessName)}</strong> est prête.</p>
       ${ctx.rewardLine ? `<p style="margin:0 0 12px;line-height:1.6;"><strong>${escapeHtml(ctx.rewardLine)}</strong></p>` : ""}
       <p style="margin:0;line-height:1.6;">
         <strong>Conservez cet email</strong> : le lien ci-dessous est le seul moyen de retrouver
         votre carte et vos points. Vous pouvez aussi l'ajouter à l'écran d'accueil de votre
         téléphone pour y accéder en un geste.
       </p>`,
      ctx,
    ),
  };
}

export function cardRecoveryEmail(ctx: EmailContext): RenderedEmail {
  const subject = `Votre carte de fidélité ${ctx.businessName}`;
  return {
    subject,
    text: `Bonjour ${ctx.firstName},

Voici le lien vers votre carte de fidélité ${ctx.businessName} :
${ctx.cardUrl}

Conservez cet email, ou ajoutez la carte à l'écran d'accueil de votre téléphone.`,
    html: layout(
      `<h1 style="margin:0 0 16px;font-size:22px;">Voici votre carte, ${escapeHtml(ctx.firstName)}</h1>
       <p style="margin:0 0 12px;line-height:1.6;">Vous nous avez demandé le lien vers votre carte de fidélité <strong>${escapeHtml(ctx.businessName)}</strong>. Le voici.</p>
       <p style="margin:0;line-height:1.6;">Conservez cet email, ou ajoutez la carte à l'écran d'accueil de votre téléphone.</p>`,
      ctx,
    ),
  };
}

export function inactive30Email(ctx: EmailContext): RenderedEmail {
  const subject = `On vous attend chez ${ctx.businessName} 👋`;
  const text = `Bonjour ${ctx.firstName},

Cela fait un petit moment qu'on ne vous a pas vu chez ${ctx.businessName}.
Votre carte de fidélité vous attend, et vos points sont toujours là.

Votre carte : ${ctx.cardUrl}

À très vite !`;
  return {
    subject,
    text,
    html: layout(
      `<h1 style="margin:0 0 16px;font-size:22px;">Bonjour ${escapeHtml(ctx.firstName)} 👋</h1>
       <p style="margin:0 0 12px;line-height:1.6;">Cela fait un petit moment qu'on ne vous a pas vu chez <strong>${escapeHtml(ctx.businessName)}</strong>.</p>
       <p style="margin:0;line-height:1.6;">Votre carte de fidélité vous attend, et vos points sont toujours là.</p>`,
      ctx,
    ),
  };
}

export function inactive60Email(ctx: EmailContext): RenderedEmail {
  const subject = `Vos points vous attendent chez ${ctx.businessName}`;
  const text = `Bonjour ${ctx.firstName},

Cela fait deux mois qu'on ne vous a pas vu chez ${ctx.businessName}.
Vos points de fidélité sont toujours disponibles : il suffit de passer nous voir.

Votre carte : ${ctx.cardUrl}

Au plaisir de vous revoir !`;
  return {
    subject,
    text,
    html: layout(
      `<h1 style="margin:0 0 16px;font-size:22px;">Vous nous manquez, ${escapeHtml(ctx.firstName)} !</h1>
       <p style="margin:0 0 12px;line-height:1.6;">Cela fait deux mois qu'on ne vous a pas vu chez <strong>${escapeHtml(ctx.businessName)}</strong>.</p>
       <p style="margin:0;line-height:1.6;">Vos points de fidélité sont toujours disponibles : il suffit de passer nous voir.</p>`,
      ctx,
    ),
  };
}

export function rewardAvailableEmail(ctx: EmailContext & { rewardName: string }): RenderedEmail {
  const subject = "Votre récompense vous attend 🎁";
  const text = `Bravo ${ctx.firstName} !

Vous avez atteint votre objectif fidélité chez ${ctx.businessName}.
Votre récompense : ${ctx.rewardName}

Présentez votre carte lors de votre prochaine visite : ${ctx.cardUrl}`;
  return {
    subject,
    text,
    html: layout(
      `<h1 style="margin:0 0 16px;font-size:22px;">Bravo ${escapeHtml(ctx.firstName)} ! 🎁</h1>
       <p style="margin:0 0 12px;line-height:1.6;">Vous avez atteint votre objectif fidélité chez <strong>${escapeHtml(ctx.businessName)}</strong>.</p>
       <p style="margin:0 0 12px;line-height:1.6;">Votre récompense : <strong>${escapeHtml(ctx.rewardName)}</strong></p>
       <p style="margin:0;line-height:1.6;">Présentez votre carte lors de votre prochaine visite.</p>`,
      ctx,
    ),
  };
}

export function campaignEmail(ctx: EmailContext & { message: string }): RenderedEmail {
  const subject = `Un message de ${ctx.businessName}`;
  const paragraphs = ctx.message
    .split(/\n{2,}/)
    .map(
      (block) =>
        `<p style="margin:0 0 12px;line-height:1.6;">${escapeHtml(block).replace(/\n/g, "<br />")}</p>`,
    )
    .join("");

  return {
    subject,
    text: `Bonjour ${ctx.firstName},\n\n${ctx.message}\n\nVotre carte : ${ctx.cardUrl}`,
    html: layout(
      `<h1 style="margin:0 0 16px;font-size:22px;">Bonjour ${escapeHtml(ctx.firstName)},</h1>${paragraphs}`,
      ctx,
    ),
  };
}

import "server-only";
import { Resend } from "resend";
import { optionalEnv } from "@/lib/env";
import type { RenderedEmail } from "@/lib/email/templates";

export interface SendResult {
  ok: boolean;
  error?: string;
}

export interface SendOptions {
  /** Nom affiché à la place du nôtre — en pratique, le nom du commerce. */
  fromName?: string | null;
  /** Adresse à laquelle les réponses du client doivent arriver. */
  replyTo?: string | null;
}

/**
 * Nettoie une valeur destinée à un en-tête d'email.
 * Les retours à la ligne permettraient d'injecter des en-têtes arbitraires
 * (Bcc, etc.) ; les guillemets et chevrons casseraient le format « Nom <adresse> ».
 */
function sanitizeHeader(value: string): string {
  return value
    .replace(/[\r\n]+/g, " ")
    .replace(/["<>,;]/g, "")
    .trim()
    .slice(0, 60);
}

/** Extrait l'adresse d'un EMAIL_FROM au format « Nom <adresse> » ou « adresse ». */
export function parseFromAddress(emailFrom: string): string | null {
  const withBrackets = emailFrom.match(/<([^>]+)>/);
  const candidate = (withBrackets ? withBrackets[1] : emailFrom).trim();
  return candidate.includes("@") ? candidate : null;
}

/**
 * Construit l'expéditeur affiché.
 *
 * L'adresse reste toujours la nôtre — c'est elle qui porte la signature DKIM du
 * domaine vérifié. Seul le nom affiché devient celui du commerce, pour que le
 * client reconnaisse l'expéditeur dans sa boîte de réception.
 */
export function buildFrom(emailFrom: string, fromName?: string | null): string {
  const address = parseFromAddress(emailFrom);
  if (!address) return emailFrom;

  const name = fromName ? sanitizeHeader(fromName) : "";
  return name ? `${name} <${address}>` : emailFrom;
}

/**
 * Envoi d'un email via Resend.
 *
 * Point d'entrée unique : ajouter un canal SMS plus tard consistera à ajouter
 * un module frère et à router sur `messages.channel`.
 */
export async function sendEmail(
  to: string,
  email: RenderedEmail,
  options: SendOptions = {},
): Promise<SendResult> {
  const apiKey = optionalEnv("RESEND_API_KEY");
  const from = optionalEnv("EMAIL_FROM");

  if (!apiKey || !from) {
    return { ok: false, error: "Resend non configuré (RESEND_API_KEY / EMAIL_FROM)." };
  }

  const replyTo = options.replyTo?.trim();

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: buildFrom(from, options.fromName),
      to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      ...(replyTo && replyTo.includes("@") ? { replyTo } : {}),
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Envoi impossible" };
  }
}

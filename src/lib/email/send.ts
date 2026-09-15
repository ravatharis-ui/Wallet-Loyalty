import "server-only";
import { Resend } from "resend";
import { optionalEnv } from "@/lib/env";
import type { RenderedEmail } from "@/lib/email/templates";

export interface SendResult {
  ok: boolean;
  error?: string;
}

/**
 * Envoi d'un email via Resend.
 *
 * Point d'entrée unique : ajouter un canal SMS plus tard consistera à ajouter
 * un module frère et à router sur `messages.channel`.
 */
export async function sendEmail(to: string, email: RenderedEmail): Promise<SendResult> {
  const apiKey = optionalEnv("RESEND_API_KEY");
  const from = optionalEnv("EMAIL_FROM");

  if (!apiKey || !from) {
    return { ok: false, error: "Resend non configuré (RESEND_API_KEY / EMAIL_FROM)." };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Envoi impossible" };
  }
}

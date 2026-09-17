import "server-only";
import webpush from "web-push";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { optionalEnv, appUrl } from "@/lib/env";
import type { PushSubscriptionRow } from "@/lib/db.types";

export interface PushPayload {
  title: string;
  body: string;
  /** Chemin interne ouvert au clic. Jamais une URL absolue venue d'ailleurs. */
  path: string;
  tag?: string;
}

export interface PushResult {
  sent: number;
  failed: number;
  configured: boolean;
}

let configured: boolean | null = null;

/** Renseigne les clés VAPID une seule fois par processus. */
function ensureConfigured(): boolean {
  if (configured !== null) return configured;

  const publicKey = optionalEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY");
  const privateKey = optionalEnv("VAPID_PRIVATE_KEY");
  const contact = optionalEnv("VAPID_SUBJECT") ?? "mailto:contact@fidelia.re";

  if (!publicKey || !privateKey) {
    configured = false;
    return false;
  }

  webpush.setVapidDetails(contact, publicKey, privateKey);
  configured = true;
  return true;
}

/**
 * Envoie une notification à tous les appareils d'un client.
 *
 * Un abonnement révoqué par le navigateur (404/410) est supprimé : le garder
 * ferait échouer tous les envois suivants sans que personne ne le voie.
 */
export async function sendPushToCustomer(
  customerId: string,
  payload: PushPayload,
): Promise<PushResult> {
  if (!ensureConfigured()) return { sent: 0, failed: 0, configured: false };

  const admin = createSupabaseAdminClient();
  const { data: subscriptions } = await admin
    .from("push_subscriptions")
    .select("*")
    .eq("customer_id", customerId)
    .returns<PushSubscriptionRow[]>();

  if (!subscriptions || subscriptions.length === 0) {
    return { sent: 0, failed: 0, configured: true };
  }

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: `${appUrl()}${payload.path}`,
    tag: payload.tag,
  });

  let sent = 0;
  let failed = 0;
  const expired: string[] = [];

  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        body,
      );
      sent += 1;
    } catch (error) {
      failed += 1;
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) expired.push(subscription.endpoint);
    }
  }

  if (expired.length > 0) {
    await admin.from("push_subscriptions").delete().in("endpoint", expired);
  }

  if (sent > 0) {
    await admin
      .from("push_subscriptions")
      .update({ last_used_at: new Date().toISOString() })
      .eq("customer_id", customerId);
  }

  return { sent, failed, configured: true };
}

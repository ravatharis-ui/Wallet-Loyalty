"use server";

import { revalidatePath } from "next/cache";
import { requireMerchant } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { campaignSchema, firstError } from "@/lib/validation";
import { getAudience } from "@/lib/audience";
import { deliverCampaign, type DeliveryResult } from "@/lib/campaigns";
import { sendEmail } from "@/lib/email/send";
import { campaignEmail } from "@/lib/email/templates";
import { appUrl } from "@/lib/env";
import type { AudienceType, CampaignChannel } from "@/lib/db.types";
import { canSendEmails } from "@/lib/loyalty";

export interface CampaignState {
  error?: string;
  success?: string;
  recipients?: number;
}

/** Formats acceptés pour l'image d'une campagne. */
const IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
const IMAGE_MAX_BYTES = 2_000_000;

export interface AudienceCount {
  total: number;
  withEmail: number;
  withPush: number;
}

/**
 * Qui est réellement joignable, et par quel canal.
 *
 * Afficher le total seul induisait en erreur : un commerçant voyait « 12
 * clients » et découvrait après l'envoi qu'aucun n'avait activé les
 * notifications.
 */
export async function countAudienceAction(audienceType: AudienceType): Promise<AudienceCount> {
  const session = await requireMerchant();
  const audience = await getAudience(session.businessId, audienceType);

  if (audience.length === 0) return { total: 0, withEmail: 0, withPush: 0 };

  const admin = createSupabaseAdminClient();
  const { data: subscriptions } = await admin
    .from("push_subscriptions")
    .select("customer_id")
    .in(
      "customer_id",
      audience.map((customer) => customer.id),
    )
    .returns<{ customer_id: string }[]>();

  // Un client peut avoir plusieurs appareils : on compte les personnes.
  const subscribers = new Set((subscriptions ?? []).map((row) => row.customer_id));

  return {
    total: audience.length,
    withEmail: audience.filter((customer) => customer.email).length,
    withPush: subscribers.size,
  };
}

/**
 * Téléverse la photo d'une campagne et renvoie son adresse publique.
 *
 * L'image part dans un email, chez un destinataire non authentifié : le bucket
 * est donc public en lecture, et l'écriture reste côté serveur.
 */
export async function uploadCampaignImageAction(
  _prev: { error?: string; url?: string },
  formData: FormData,
): Promise<{ error?: string; url?: string }> {
  const session = await requireMerchant();

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return { error: "Choisissez une image." };
  if (file.size > IMAGE_MAX_BYTES) return { error: "Image trop lourde : 2 Mo maximum." };
  if (!IMAGE_MIME_TYPES.includes(file.type as (typeof IMAGE_MIME_TYPES)[number])) {
    return { error: "Format non accepté. Utilisez un PNG, un JPEG ou un WebP." };
  }

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${session.businessId}/${Date.now()}.${extension}`;

  const admin = createSupabaseAdminClient();
  const { error } = await admin.storage
    .from("campaign-images")
    .upload(path, file, { contentType: file.type, upsert: true });

  if (error) return { error: "Téléversement impossible. Réessayez." };

  const {
    data: { publicUrl },
  } = admin.storage.from("campaign-images").getPublicUrl(path);

  return { url: publicUrl };
}

/** Envoi d'essai à l'adresse du commerçant, avant d'écrire à tout le fichier. */
export async function sendTestCampaignAction(
  _prev: CampaignState,
  formData: FormData,
): Promise<CampaignState> {
  const session = await requireMerchant();

  if (!session.business.email) {
    return { error: "Renseignez l'email de votre commerce dans Réglages pour recevoir un test." };
  }

  const parsed = campaignSchema.safeParse({
    name: formData.get("name"),
    subject: formData.get("subject") ?? "",
    message: formData.get("message"),
    channel: formData.get("channel") ?? "email",
    audienceType: formData.get("audienceType"),
    imageUrl: formData.get("imageUrl") ?? "",
    scheduledAt: formData.get("scheduledAt") ?? "",
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const rendered = campaignEmail({
    businessName: session.business.name,
    // Le test montre la personnalisation à l'œuvre plutôt qu'une variable brute.
    firstName: "Camille",
    cardUrl: `${appUrl()}/dashboard`,
    message: parsed.data.message,
    subject: parsed.data.subject,
    imageUrl: parsed.data.imageUrl,
  });

  const result = await sendEmail(session.business.email, rendered, {
    fromName: session.business.name,
  });

  if (!result.ok) return { error: "Envoi du test impossible. Vérifiez la configuration email." };
  return { success: `Test envoyé à ${session.business.email}.` };
}

/**
 * Crée la campagne, puis l'envoie immédiatement ou la programme.
 *
 * L'envoi réel vit dans `deliverCampaign`, partagé avec le cron : une campagne
 * part de la même façon qu'on ait cliqué « Envoyer » ou qu'une date soit venue.
 */
export async function sendCampaignAction(
  _prev: CampaignState,
  formData: FormData,
): Promise<CampaignState> {
  const session = await requireMerchant();

  if (!canSendEmails(session.access)) {
    return { error: "Abonnement expiré : les campagnes sont suspendues." };
  }

  const parsed = campaignSchema.safeParse({
    name: formData.get("name"),
    subject: formData.get("subject") ?? "",
    message: formData.get("message"),
    channel: formData.get("channel") ?? "email",
    audienceType: formData.get("audienceType"),
    imageUrl: formData.get("imageUrl") ?? "",
    scheduledAt: formData.get("scheduledAt") ?? "",
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { name, subject, message, channel, audienceType, imageUrl, scheduledAt } = parsed.data;
  const audience = await getAudience(session.businessId, audienceType);

  if (audience.length === 0) {
    return { error: "Aucun destinataire pour cette audience." };
  }

  const scheduled = scheduledAt ? new Date(scheduledAt) : null;
  if (scheduled && scheduled.getTime() < Date.now()) {
    return { error: "La date d'envoi est déjà passée." };
  }

  const admin = createSupabaseAdminClient();
  const { data: campaign, error: campaignError } = await admin
    .from("campaigns")
    .insert({
      business_id: session.businessId,
      name,
      subject,
      message,
      channel,
      image_url: imageUrl,
      audience_type: audienceType,
      status: scheduled ? "scheduled" : "draft",
      scheduled_at: scheduled ? scheduled.toISOString() : null,
      recipients: 0,
    })
    .select("id")
    .single<{ id: string }>();

  if (campaignError || !campaign) return { error: "Création de la campagne impossible." };

  revalidatePath("/dashboard/campaigns");

  if (scheduled) {
    return {
      success: `Campagne programmée pour le ${scheduled.toLocaleDateString("fr-FR")}. Elle partira automatiquement à ${audience.length} client(s).`,
      recipients: audience.length,
    };
  }

  const result = await deliverCampaign(campaign.id);
  revalidatePath("/dashboard/campaigns");

  if (result.sent === 0) {
    return { error: explainEmptyDelivery(result, channel) };
  }

  const detail =
    channel === "both"
      ? ` (${result.emailSent} par email, ${result.pushSent} en notification)`
      : "";
  return {
    success: `Campagne envoyée à ${result.sent} client(s)${detail}.`,
    recipients: result.sent,
  };
}

/**
 * Dit ce qui a réellement manqué.
 *
 * Un message d'erreur qui parle d'email alors qu'on testait les notifications
 * envoie le commerçant chercher au mauvais endroit.
 */
function explainEmptyDelivery(result: DeliveryResult, channel: CampaignChannel): string {
  if (channel === "push") {
    if (!result.pushConfigured) {
      return "Les notifications ne sont pas encore configurées sur ce site.";
    }
    return "Aucun de vos clients n'a activé les notifications sur son téléphone. Elles s'activent depuis leur carte de fidélité.";
  }

  if (channel === "email") {
    if (result.withEmail === 0) {
      return "Aucun client de cette audience n'a renseigné d'adresse email.";
    }
    return "Aucun email n'a pu être envoyé. Vérifiez la configuration email dans Réglages.";
  }

  if (result.withEmail === 0 && result.pushSent === 0) {
    return "Personne n'est joignable dans cette audience : aucune adresse email, et aucune notification activée.";
  }
  return "Aucun message n'a pu être envoyé, ni par email ni en notification.";
}

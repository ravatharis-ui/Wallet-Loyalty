"use server";

import { revalidatePath } from "next/cache";
import { requireMerchant } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { campaignSchema, firstError } from "@/lib/validation";
import { getAudience } from "@/lib/audience";
import { sendEmail } from "@/lib/email/send";
import { campaignEmail } from "@/lib/email/templates";
import { appUrl } from "@/lib/env";
import type { AudienceType } from "@/lib/db.types";

export interface CampaignState {
  error?: string;
  success?: string;
  recipients?: number;
}

/** Nombre de destinataires, affiché avant l'envoi. */
export async function countAudienceAction(audienceType: AudienceType): Promise<number> {
  const session = await requireMerchant();
  const audience = await getAudience(session.businessId, audienceType);
  return audience.length;
}

export async function sendCampaignAction(
  _prev: CampaignState,
  formData: FormData,
): Promise<CampaignState> {
  const session = await requireMerchant();

  if (!session.subscriptionActive) {
    return { error: "Abonnement inactif : les campagnes sont suspendues." };
  }

  const parsed = campaignSchema.safeParse({
    name: formData.get("name"),
    message: formData.get("message"),
    audienceType: formData.get("audienceType"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { name, message, audienceType } = parsed.data;
  const audience = await getAudience(session.businessId, audienceType);

  if (audience.length === 0) {
    return { error: "Aucun destinataire pour cette audience." };
  }

  const admin = createSupabaseAdminClient();
  const { data: campaign, error: campaignError } = await admin
    .from("campaigns")
    .insert({
      business_id: session.businessId,
      name,
      message,
      audience_type: audienceType,
      recipients: audience.length,
    })
    .select("id")
    .single<{ id: string }>();

  if (campaignError || !campaign) return { error: "Création de la campagne impossible." };

  let sent = 0;
  const now = new Date().toISOString();

  for (const customer of audience) {
    if (!customer.email) continue;

    const rendered = campaignEmail({
      businessName: session.business.name,
      firstName: customer.first_name,
      cardUrl: `${appUrl()}/card/${customer.card_token}`,
      message,
    });

    const result = await sendEmail(customer.email, rendered, {
      fromName: session.business.name,
      replyTo: session.business.email,
    });
    if (result.ok) sent += 1;

    await admin.from("messages").insert({
      business_id: session.businessId,
      customer_id: customer.id,
      type: "campaign",
      channel: "email",
      status: result.ok ? "sent" : "failed",
      subject: rendered.subject,
      content: rendered.text,
      sent_at: result.ok ? now : null,
    });
  }

  await admin.from("campaigns").update({ sent_at: now }).eq("id", campaign.id);

  revalidatePath("/dashboard/campaigns");

  return sent === 0
    ? { error: "Aucun email n'a pu être envoyé. Vérifiez la configuration Resend." }
    : { success: `Campagne envoyée à ${sent} client(s).`, recipients: sent };
}

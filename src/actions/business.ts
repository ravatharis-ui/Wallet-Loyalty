"use server";

import { revalidatePath } from "next/cache";
import { requireMerchant } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { businessSchema, firstError, LOGO_MAX_BYTES, LOGO_MIME_TYPES } from "@/lib/validation";
import { basketToCents } from "@/lib/revenue";

export interface BusinessState {
  error?: string;
  success?: string;
}

export async function saveBusinessAction(
  _prev: BusinessState,
  formData: FormData,
): Promise<BusinessState> {
  const session = await requireMerchant();

  const parsed = businessSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") ?? "",
    email: formData.get("email") ?? "",
    cardColor: formData.get("cardColor") ?? "#111827",
    averageBasket: formData.get("averageBasket") ?? "",
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createSupabaseServerClient();
  // Le slug n'est pas modifiable : les QR codes déjà imprimés doivent continuer à fonctionner.
  const { error } = await supabase
    .from("businesses")
    .update({
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email,
      card_color: parsed.data.cardColor,
      average_basket_cents: basketToCents(parsed.data.averageBasket ?? ""),
    })
    .eq("id", session.businessId);

  if (error) return { error: "Enregistrement impossible. Réessayez." };

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  return { success: "Informations enregistrées." };
}

/**
 * Téléverse le logo du commerce.
 *
 * Le fichier passe par le serveur : le type et la taille sont vérifiés ici, et
 * l'écriture utilise la service role key. Aucun accès direct au stockage n'est
 * ouvert au navigateur. Le chemin est préfixé par le business_id, si bien qu'un
 * commerce ne peut jamais écraser le logo d'un autre.
 */
export async function uploadLogoAction(
  _prev: BusinessState,
  formData: FormData,
): Promise<BusinessState> {
  const session = await requireMerchant();

  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choisissez une image." };
  }
  if (file.size > LOGO_MAX_BYTES) {
    return { error: "Image trop lourde : 1 Mo maximum." };
  }
  if (!LOGO_MIME_TYPES.includes(file.type as (typeof LOGO_MIME_TYPES)[number])) {
    return { error: "Format non accepté. Utilisez un PNG, un JPEG ou un WebP." };
  }

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${session.businessId}/logo-${Date.now()}.${extension}`;

  const admin = createSupabaseAdminClient();
  const { error: uploadError } = await admin.storage
    .from("logos")
    .upload(path, file, { contentType: file.type, upsert: true });

  if (uploadError) {
    return { error: "Téléversement impossible. Réessayez." };
  }

  const {
    data: { publicUrl },
  } = admin.storage.from("logos").getPublicUrl(path);

  const { error } = await admin
    .from("businesses")
    .update({ logo_url: publicUrl })
    .eq("id", session.businessId);

  if (error) return { error: "Enregistrement du logo impossible." };

  revalidatePath("/dashboard/settings");
  return { success: "Logo enregistré." };
}

export async function removeLogoAction(
  _prev: BusinessState,
  _formData: FormData,
): Promise<BusinessState> {
  const session = await requireMerchant();

  const admin = createSupabaseAdminClient();
  const { data: files } = await admin.storage.from("logos").list(session.businessId);
  if (files?.length) {
    await admin.storage
      .from("logos")
      .remove(files.map((file) => `${session.businessId}/${file.name}`));
  }

  await admin.from("businesses").update({ logo_url: null }).eq("id", session.businessId);

  revalidatePath("/dashboard/settings");
  return { success: "Logo supprimé." };
}

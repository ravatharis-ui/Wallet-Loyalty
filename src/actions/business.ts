"use server";

import { revalidatePath } from "next/cache";
import { requireMerchant } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { businessSchema, firstError } from "@/lib/validation";

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
    })
    .eq("id", session.businessId);

  if (error) return { error: "Enregistrement impossible. Réessayez." };

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  return { success: "Informations enregistrées." };
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMerchant } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/validation";

/**
 * Suppression RGPD d'un client.
 * Les visites, récompenses et messages sont supprimés en cascade (ON DELETE CASCADE).
 */
export async function deleteCustomerAction(formData: FormData): Promise<void> {
  const session = await requireMerchant();

  const parsed = uuidSchema.safeParse(formData.get("customerId"));
  if (!parsed.success) redirect("/dashboard/customers?error=client-invalide");

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("customers")
    .delete()
    .eq("id", parsed.data)
    .eq("business_id", session.businessId);

  revalidatePath("/dashboard/customers");
  revalidatePath("/dashboard");
  redirect("/dashboard/customers?deleted=1");
}

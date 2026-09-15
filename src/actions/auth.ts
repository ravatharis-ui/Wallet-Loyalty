"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { loginSchema, signupSchema, firstError } from "@/lib/validation";
import { slugify, trialPeriodEnd, DEFAULT_TRIAL_DAYS } from "@/lib/loyalty";

export interface ActionState {
  error?: string;
  success?: string;
}

/** Slug unique dérivé du nom du commerce. */
async function uniqueSlug(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  name: string,
): Promise<string> {
  const base = slugify(name) || "commerce";
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const { data } = await admin
      .from("businesses")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function signupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signupSchema.safeParse({
    businessName: formData.get("businessName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { businessName, email, password } = parsed.data;
  const supabase = await createSupabaseServerClient();

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError) {
    return { error: signUpError.message };
  }
  const user = signUpData.user;
  if (!user) {
    return { error: "Inscription impossible. Réessayez." };
  }

  const admin = createSupabaseAdminClient();

  // L'utilisateur a-t-il déjà un commerce ? (re-soumission du formulaire)
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("business_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!existingProfile) {
    const slug = await uniqueSlug(admin, businessName);

    const { data: business, error: businessError } = await admin
      .from("businesses")
      .insert({ name: businessName.trim(), slug, email })
      .select("id")
      .single();

    if (businessError || !business) {
      return { error: "Impossible de créer le commerce. Réessayez." };
    }

    const { error: profileError } = await admin
      .from("profiles")
      .insert({ id: user.id, business_id: business.id, role: "merchant" });

    if (profileError) {
      return { error: "Impossible de finaliser le compte. Réessayez." };
    }

    // Programme de fidélité par défaut, modifiable immédiatement.
    await admin.from("loyalty_programs").insert({
      business_id: business.id,
      name: "Ma fidélité",
      points_per_visit: 1,
      reward_threshold: 10,
      reward_name: "1 récompense offerte",
      active: true,
    });

    // Essai gratuit ouvert immédiatement, sans carte bancaire. Le webhook
    // Stripe écrasera ce statut dès que le commerçant s'abonnera.
    const configuredTrial = Number(process.env.STRIPE_TRIAL_DAYS ?? DEFAULT_TRIAL_DAYS);
    await admin.from("subscriptions").insert({
      business_id: business.id,
      status: "trialing",
      current_period_end: trialPeriodEnd(configuredTrial),
    });
  }

  if (!signUpData.session) {
    // La confirmation d'email est activée sur le projet Supabase.
    return {
      success:
        "Compte créé. Vérifiez votre boîte mail pour confirmer votre adresse, puis connectez-vous.",
    };
  }

  redirect("/dashboard");
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) return { error: "Email ou mot de passe incorrect." };

  const next = String(formData.get("next") ?? "/dashboard");
  redirect(next.startsWith("/dashboard") ? next : "/dashboard");
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

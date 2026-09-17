"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  loginSchema,
  signupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  firstError,
} from "@/lib/validation";
import { appUrl } from "@/lib/env";
import { slugify } from "@/lib/loyalty";

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

    // Programme et catalogue par défaut, modifiables immédiatement. Un compte
    // livré avec un catalogue vide donnerait des points qui ne servent à rien.
    await admin.from("loyalty_programs").insert({
      business_id: business.id,
      name: "Ma fidélité",
      points_per_visit: 1,
      active: true,
    });

    await admin.from("reward_tiers").insert({
      business_id: business.id,
      name: "1 récompense offerte",
      points_cost: 10,
    });

    // Mode découverte : tout fonctionne, plafonné à FREE_TIER_CUSTOMER_LIMIT
    // cartes. L'essai gratuit démarre à la souscription, côté Stripe.
    await admin.from("subscriptions").insert({ business_id: business.id, status: "none" });
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

/**
 * Envoie un lien de réinitialisation.
 *
 * La réponse est volontairement identique que l'adresse existe ou non : révéler
 * quels emails sont inscrits permettrait d'énumérer les commerçants.
 */
export async function forgotPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createSupabaseServerClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl()}/auth/callback?next=/nouveau-mot-de-passe`,
  });

  return {
    success:
      "Si un compte existe pour cette adresse, un lien de réinitialisation vient d'être envoyé. Pensez à vérifier vos spams.",
  };
}

/** Définit le nouveau mot de passe, une fois le lien de l'email ouvert. */
export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmation: formData.get("confirmation"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createSupabaseServerClient();

  // Le lien de l'email ouvre une session de récupération : sans elle, la
  // demande ne vient pas du propriétaire de l'adresse.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "Lien expiré ou déjà utilisé. Demandez un nouveau lien de réinitialisation.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.message };

  redirect("/dashboard");
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

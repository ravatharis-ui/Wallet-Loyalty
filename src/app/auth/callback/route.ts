import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Point d'atterrissage des liens envoyés par email (réinitialisation de mot de
 * passe, confirmation d'adresse).
 *
 * Supabase utilise le flux PKCE : le lien arrive avec un `code` à échanger
 * contre une session. Cet échange écrit des cookies, ce qu'un Server Component
 * ne peut pas faire — d'où ce Route Handler.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // Redirection interne uniquement : une URL absolue permettrait de rediriger
  // vers un site tiers depuis un lien signé par nos soins.
  const requested = searchParams.get("next") ?? "/dashboard";
  const next = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/dashboard";

  const supabase = await createSupabaseServerClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  } else if (tokenHash && type) {
    // Flux par lien magique, selon la configuration du projet Supabase.
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/login?error=lien-invalide`);
}

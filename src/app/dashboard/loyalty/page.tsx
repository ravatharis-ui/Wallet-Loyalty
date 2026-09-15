import { requireMerchant } from "@/lib/auth";
import { getActiveProgram } from "@/actions/loyalty";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { LoyaltyProgram } from "@/lib/db.types";
import { LoyaltyForm } from "./loyalty-form";

export const metadata = { title: "Programme de fidélité" };

export default async function LoyaltyPage() {
  const session = await requireMerchant();

  // On récupère le programme actif, sinon le plus ancien (désactivé).
  let program: LoyaltyProgram | null = await getActiveProgram(session.businessId);
  if (!program) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("loyalty_programs")
      .select("*")
      .eq("business_id", session.businessId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle<LoyaltyProgram>();
    program = data ?? null;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Programme de fidélité</h1>
        <p className="text-sm text-muted-foreground">
          Une visite = un nombre de points. Au seuil atteint, le client gagne sa récompense.
        </p>
      </header>
      <LoyaltyForm program={program} />
    </div>
  );
}

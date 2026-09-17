import { requireMerchant } from "@/lib/auth";
import { getActiveProgram, getRewardTiers } from "@/actions/loyalty";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { LoyaltyProgram } from "@/lib/db.types";
import { LoyaltyForm } from "./loyalty-form";
import { RewardTiers } from "./reward-tiers";

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

  const tiers = await getRewardTiers(session.businessId);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-[-0.03em]">Programme de fidélité</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          Vos clients cumulent des points à chaque passage, puis les dépensent dans votre catalogue
          de récompenses. C&apos;est le client qui choisit quand il échange.
        </p>
      </header>
      <LoyaltyForm program={program} />
      <RewardTiers tiers={tiers} mode={program?.mode ?? "stamp"} />
    </div>
  );
}

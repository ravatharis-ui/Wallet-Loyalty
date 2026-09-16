import Link from "next/link";
import { requireMerchant } from "@/lib/auth";
import { BottomNav, SideNav } from "@/components/dashboard-nav";
import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { TRIAL_DAYS } from "@/lib/pricing";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireMerchant();

  return (
    <div className="min-h-dvh pb-24 md:pb-0">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <Link href="/dashboard" className="font-semibold">
            {session.business.name}
          </Link>
          <form action={logoutAction}>
            <Button variant="ghost" size="sm" type="submit">
              Déconnexion
            </Button>
          </form>
        </div>
      </header>

      {session.access.level === "free" ? (
        <div className="border-b border-indigo-200 bg-indigo-50">
          <div className="mx-auto flex max-w-5xl flex-col gap-2 px-5 py-3 text-sm text-indigo-900 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Mode découverte :{" "}
              <strong>
                {session.customerCount} / {session.access.customerLimit} cartes clients
              </strong>
              . Abonnez-vous pour passer en illimité — {TRIAL_DAYS} jours d&apos;essai, résiliable à
              tout moment.
            </span>
            <Button asChild size="sm" variant="accent">
              <Link href="/dashboard/settings#abonnement">Passer en illimité</Link>
            </Button>
          </div>
        </div>
      ) : null}

      {session.access.level === "grace" || session.access.level === "blocked" ? (
        <div
          className={
            session.access.level === "blocked"
              ? "border-b border-red-200 bg-red-50"
              : "border-b border-amber-200 bg-amber-50"
          }
        >
          <div
            className={`mx-auto flex max-w-5xl flex-col gap-2 px-5 py-3 text-sm sm:flex-row sm:items-center sm:justify-between ${
              session.access.level === "blocked" ? "text-red-900" : "text-amber-900"
            }`}
          >
            <span>
              {session.access.level === "blocked" ? (
                <>
                  Abonnement expiré. L&apos;enregistrement des visites est suspendu. Vos clients et
                  leurs points sont conservés : réactivez pour tout relancer.
                </>
              ) : (
                <>
                  Votre abonnement a expiré. Il vous reste{" "}
                  <strong>
                    {session.access.graceDaysLeft} jour
                    {(session.access.graceDaysLeft ?? 0) > 1 ? "s" : ""}
                  </strong>{" "}
                  pour le réactiver avant que l&apos;enregistrement des visites soit suspendu. Les
                  emails sont déjà suspendus.
                </>
              )}
            </span>
            <Button asChild size="sm" variant="accent">
              <Link href="/dashboard/settings#abonnement">Réactiver l&apos;abonnement</Link>
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex max-w-5xl gap-8 px-5 py-6">
        <SideNav />
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <BottomNav />
    </div>
  );
}

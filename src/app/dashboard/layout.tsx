import Link from "next/link";
import { HelpCircle } from "lucide-react";
import { requireMerchant } from "@/lib/auth";
import { BottomNav, SideNav } from "@/components/dashboard-nav";
import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { TRIAL_DAYS } from "@/lib/pricing";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireMerchant();

  return (
    <div className="min-h-dvh pb-24 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3">
          <Link
            href="/dashboard"
            className="flex min-w-0 items-center gap-2.5 rounded-md transition-opacity hover:opacity-80"
          >
            <span
              aria-hidden
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-foreground font-display text-lg leading-none text-background"
            >
              F
            </span>
            <span className="truncate font-semibold tracking-[-0.01em]">
              {session.business.name}
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/aide">
                <HelpCircle className="mr-1.5 h-4 w-4" aria-hidden />
                Guide
              </Link>
            </Button>
            <form action={logoutAction}>
              <Button variant="ghost" size="sm" type="submit">
                Déconnexion
              </Button>
            </form>
          </div>
        </div>
      </header>

      {session.access.level === "free" ? (
        <div className="border-b border-accent/20 bg-accent-soft">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-3 text-sm leading-relaxed text-accent sm:flex-row sm:items-center sm:justify-between">
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
              ? "border-b border-danger/20 bg-danger-soft"
              : "border-b border-warning/20 bg-warning-soft"
          }
        >
          <div
            className={`mx-auto flex max-w-6xl flex-col gap-2 px-5 py-3 text-sm leading-relaxed sm:flex-row sm:items-center sm:justify-between ${
              session.access.level === "blocked" ? "text-danger" : "text-warning"
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

      <div className="mx-auto flex max-w-6xl gap-10 px-5 py-8">
        <SideNav />
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <BottomNav />
    </div>
  );
}

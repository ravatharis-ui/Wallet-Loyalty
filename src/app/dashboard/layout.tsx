import Link from "next/link";
import { requireMerchant } from "@/lib/auth";
import { BottomNav, SideNav } from "@/components/dashboard-nav";
import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";

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

      {!session.subscriptionActive ? (
        <div className="border-b border-amber-200 bg-amber-50">
          <div className="mx-auto flex max-w-5xl flex-col gap-2 px-5 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Votre abonnement n&apos;est pas actif. Les envois d&apos;emails et les campagnes sont
              suspendus.
            </span>
            <Button asChild size="sm" variant="accent">
              <Link href="/dashboard/settings#abonnement">Activer l&apos;abonnement</Link>
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

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ScanLine, Users, Gift, Megaphone, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Accueil", icon: Home },
  { href: "/dashboard/scan", label: "Scanner", icon: ScanLine },
  { href: "/dashboard/customers", label: "Clients", icon: Users },
  { href: "/dashboard/loyalty", label: "Fidélité", icon: Gift },
  { href: "/dashboard/campaigns", label: "Campagnes", icon: Megaphone },
  { href: "/dashboard/settings", label: "Réglages", icon: Settings },
];

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navigation principale"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-md md:hidden"
    >
      <ul className="grid grid-cols-6">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center gap-1 px-1 pb-1 pt-2.5 text-[10px] font-medium transition-colors",
                  active ? "text-accent" : "text-muted-foreground",
                )}
              >
                {/* Trait sous l'onglet actif : la couleur seule ne suffit pas. */}
                {active ? (
                  <span
                    aria-hidden
                    className="absolute inset-x-3 top-0 h-0.5 rounded-b-full bg-accent"
                  />
                ) : null}
                <item.icon className="h-5 w-5" aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SideNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Navigation principale" className="hidden w-52 shrink-0 md:block">
      <ul className="sticky top-24 space-y-0.5">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg py-2 pl-3.5 pr-3 text-sm font-medium transition-colors duration-200",
                  active
                    ? "bg-accent-soft text-accent"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {active ? (
                  <span
                    aria-hidden
                    className="absolute inset-y-1.5 left-0 w-0.5 rounded-r-full bg-accent"
                  />
                ) : null}
                <item.icon className="h-4 w-4" aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

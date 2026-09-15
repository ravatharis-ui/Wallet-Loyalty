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
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background md:hidden"
    >
      <ul className="grid grid-cols-6">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-1 pt-2 text-[10px]",
                isActive(pathname, item.href) ? "text-accent" : "text-muted-foreground",
              )}
            >
              <item.icon className="h-5 w-5" aria-hidden />
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function SideNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Navigation principale" className="hidden w-56 shrink-0 md:block">
      <ul className="sticky top-6 space-y-1">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium",
                isActive(pathname, item.href)
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              <item.icon className="h-4 w-4" aria-hidden />
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

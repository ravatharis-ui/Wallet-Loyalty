import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Marque Fidelia : un « F » encré dans un carré, repris du favicon.
 * Le carré arrondi plutôt que le cercle, pour ne pas ressembler à un avatar.
 */
export function Wordmark({
  className,
  href = "/",
  subtle = false,
}: {
  className?: string;
  href?: string | null;
  subtle?: boolean;
}) {
  const content = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        aria-hidden
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-md font-display text-lg leading-none",
          subtle ? "bg-surface text-foreground" : "bg-foreground text-background",
        )}
      >
        F
      </span>
      <span className="text-[1.0625rem] font-semibold tracking-[-0.02em]">Fidelia</span>
    </span>
  );

  if (!href) return content;
  return (
    <Link href={href} className="rounded-md transition-opacity hover:opacity-80">
      {content}
    </Link>
  );
}

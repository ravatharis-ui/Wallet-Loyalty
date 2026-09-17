import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Surface de contenu.
 *
 * `plain` (défaut) ne pose qu'un filet : on ne dépense de l'élévation que
 * lorsqu'elle dit quelque chose. `raised` est réservé à ce qui doit flotter
 * au-dessus du reste, `flat` au regroupement sans hiérarchie.
 */
export function Card({
  className,
  variant = "plain",
  ...props
}: React.ComponentProps<"div"> & { variant?: "plain" | "raised" | "flat" }) {
  const variants = {
    plain: "border border-border bg-surface shadow-xs",
    raised: "border border-border bg-surface shadow-md",
    flat: "bg-muted",
  };
  return <div className={cn("rounded-card p-5", variants[variant], className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return <h3 className={cn("text-base font-semibold tracking-[-0.01em]", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p className={cn("text-sm leading-relaxed text-muted-foreground", className)} {...props} />
  );
}

/** Intitulé court au-dessus d'un chiffre ou d'un groupe de champs. */
export function CardLabel({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

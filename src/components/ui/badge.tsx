import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Étiquette d'état. Angles légèrement adoucis plutôt que pilule : la pilule
 * « New / Beta » est le réflexe par défaut, et elle ne dit rien de plus.
 */
const styles = {
  default: "bg-muted text-muted-foreground",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  accent: "bg-accent-soft text-accent",
  reward: "bg-reward-soft text-reward",
} as const;

export function Badge({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"span"> & { variant?: keyof typeof styles }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}

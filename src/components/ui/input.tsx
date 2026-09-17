import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Le champ vit sur un fond légèrement teinté et devient blanc au focus :
 * l'état actif se lit sans dépendre uniquement de la couleur du contour.
 */
const fieldStyles = [
  "w-full rounded-lg border border-border bg-surface text-base text-foreground",
  "transition-[border-color,box-shadow,background-color] duration-200 ease-[var(--ease-out-soft)]",
  "placeholder:text-muted-foreground/70",
  "hover:border-border-strong",
  "focus-visible:border-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/12",
  "disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60",
  "aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/12",
].join(" ");

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input type={type} ref={ref} className={cn(fieldStyles, "h-12 px-4", className)} {...props} />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(fieldStyles, "min-h-28 px-4 py-3 leading-relaxed", className)}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(
  ({ className, ...props }, ref) => (
    <select ref={ref} className={cn(fieldStyles, "h-12 px-3.5", className)} {...props} />
  ),
);
Select.displayName = "Select";

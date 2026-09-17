import { cn } from "@/lib/utils";

/**
 * Message d'état. Le filet vertical à gauche remplace l'aplat coloré :
 * il signale sans crier, et reste lisible sur fond papier.
 */
export function Alert({
  children,
  variant = "info",
  className,
}: {
  children: React.ReactNode;
  variant?: "info" | "error" | "success";
  className?: string;
}) {
  if (!children) return null;
  const styles = {
    info: "border-border bg-muted text-foreground before:bg-border-strong",
    error: "border-danger/20 bg-danger-soft text-danger before:bg-danger",
    success: "border-success/20 bg-success-soft text-success before:bg-success",
  };
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "relative overflow-hidden rounded-lg border py-3 pl-5 pr-4 text-sm leading-relaxed",
        "before:absolute before:inset-y-0 before:left-0 before:w-1 before:content-['']",
        styles[variant],
        className,
      )}
    >
      {children}
    </div>
  );
}

import { cn } from "@/lib/utils";

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
    info: "border-border bg-muted text-foreground",
    error: "border-red-200 bg-red-50 text-red-800",
    success: "border-green-200 bg-green-50 text-green-800",
  };
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn("rounded-xl border px-4 py-3 text-sm", styles[variant], className)}
    >
      {children}
    </div>
  );
}

import Link from "next/link";
import { requireMerchant } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { inactivityCutoff } from "@/lib/stats";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { formatRelativeDays, cn } from "@/lib/utils";
import { CustomerSearch } from "./customer-search";

export const metadata = { title: "Clients" };

interface CustomerRow {
  id: string;
  first_name: string;
  phone: string;
  current_points: number;
  total_visits: number;
  last_visit_at: string | null;
  rewards: { id: string }[];
}

const filters = [
  { value: "all", label: "Tous" },
  { value: "inactive", label: "À relancer" },
  { value: "reward", label: "Récompense dispo" },
] as const;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string; deleted?: string }>;
}) {
  const session = await requireMerchant();
  const { filter = "all", q = "", deleted } = await searchParams;
  const supabase = await createSupabaseServerClient();

  // "Récompense disponible" nécessite une jointure filtrante, les autres non.
  let query =
    filter === "reward"
      ? supabase
          .from("customers")
          .select(
            "id, first_name, phone, current_points, total_visits, last_visit_at, rewards!inner(id)",
          )
          .eq("business_id", session.businessId)
          .eq("rewards.status", "available")
          .order("last_visit_at", { ascending: false, nullsFirst: false })
          .limit(200)
      : supabase
          .from("customers")
          .select("id, first_name, phone, current_points, total_visits, last_visit_at, rewards(id)")
          .eq("business_id", session.businessId)
          .order("last_visit_at", { ascending: false, nullsFirst: false })
          .limit(200);

  if (filter === "inactive") {
    query = query.not("last_visit_at", "is", null).lt("last_visit_at", inactivityCutoff());
  }

  const term = q
    .trim()
    .slice(0, 40)
    .replace(/[%_,()]/g, " ");
  if (term.length >= 2) {
    query = query.or(`first_name.ilike.%${term}%,phone.ilike.%${term}%`);
  }

  const { data: customers } = await query.returns<CustomerRow[]>();

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-sm text-muted-foreground">
            {customers?.length ?? 0} client(s) affiché(s)
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/customers/import">Importer un fichier</Link>
        </Button>
      </header>

      {deleted ? <Alert variant="success">Client supprimé.</Alert> : null}

      <CustomerSearch defaultValue={q} filter={filter} />

      <div className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <Link
            key={item.value}
            href={`/dashboard/customers?filter=${item.value}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm",
              filter === item.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-muted",
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {customers && customers.length > 0 ? (
        <Card className="divide-y divide-border p-0">
          {customers.map((customer) => {
            const rewardCount = customer.rewards?.length ?? 0;
            return (
              <Link
                key={customer.id}
                href={`/dashboard/customers/${customer.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 hover:bg-muted"
              >
                <div className="min-w-0">
                  <p className="font-medium">{customer.first_name}</p>
                  <p className="text-sm text-muted-foreground">{customer.phone}</p>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground">{customer.current_points} pts</span>
                  <span className="text-muted-foreground">
                    {formatRelativeDays(customer.last_visit_at)}
                  </span>
                  {rewardCount > 0 ? <Badge variant="success">🎁 {rewardCount}</Badge> : null}
                </div>
              </Link>
            );
          })}
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-muted-foreground">
            Aucun client pour ce filtre. Partagez votre QR code d&apos;inscription depuis les{" "}
            <Link href="/dashboard/settings" className="underline">
              réglages
            </Link>
            .
          </p>
        </Card>
      )}
    </div>
  );
}

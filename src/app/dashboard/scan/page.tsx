import { requireMerchant } from "@/lib/auth";
import { getActiveProgram } from "@/actions/loyalty";
import { Alert } from "@/components/ui/alert";
import Link from "next/link";
import { ScanClient } from "./scan-client";

export const metadata = { title: "Scanner un client" };

export default async function ScanPage() {
  const session = await requireMerchant();
  const program = await getActiveProgram(session.businessId);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Scanner un client</h1>
        <p className="text-sm text-muted-foreground">
          Scannez le QR code de la carte du client pour ajouter une visite.
        </p>
      </header>

      {program ? (
        <ScanClient />
      ) : (
        <Alert variant="error">
          Aucun programme de fidélité actif.{" "}
          <Link href="/dashboard/loyalty" className="underline">
            Configurez-le d&apos;abord
          </Link>
          .
        </Alert>
      )}
    </div>
  );
}

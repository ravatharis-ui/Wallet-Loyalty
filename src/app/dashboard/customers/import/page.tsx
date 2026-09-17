import Link from "next/link";
import { requireMerchant } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { ImportForm } from "./import-form";

export const metadata = { title: "Importer mes clients" };

export default async function ImportPage() {
  const session = await requireMerchant();
  const limit = session.access.customerLimit;

  return (
    <div className="space-y-5">
      <Link href="/dashboard/customers" className="text-sm text-muted-foreground underline">
        ← Tous les clients
      </Link>

      <header>
        <h1 className="text-3xl font-semibold tracking-[-0.03em]">Importer mes clients</h1>
        <p className="text-sm text-muted-foreground">
          Reprenez votre fichier existant — carnet, tableur, ancien logiciel — avec les points déjà
          acquis par vos clients.
        </p>
      </header>

      {limit !== null ? (
        <Alert variant="error">
          {limit === 0
            ? "Votre abonnement a expiré : réactivez-le pour importer des clients."
            : `Le mode découverte est limité à ${limit} cartes. Passez en illimité pour importer votre fichier.`}{" "}
          <Link href="/dashboard/settings#abonnement" className="underline">
            Voir l&apos;abonnement
          </Link>
        </Alert>
      ) : null}

      <Card className="space-y-3">
        <p className="text-sm font-medium">Le format attendu</p>
        <p className="text-sm text-muted-foreground">
          Un fichier <strong>CSV</strong> — depuis Excel ou Google Sheets, « Enregistrer sous » puis
          CSV. La première ligne contient les noms de colonnes :
        </p>
        <pre className="overflow-x-auto rounded-xl bg-muted p-4 text-xs">
          {`Prénom;Téléphone;Email;Visites;Points
Léa;06 12 34 56 78;lea@exemple.fr;7;7
Marc;06 98 76 54 32;;3;3`}
        </pre>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>
            • <strong>Prénom</strong> et <strong>Téléphone</strong> sont obligatoires.
          </li>
          <li>
            • <strong>Email</strong>, <strong>Visites</strong> et <strong>Points</strong> sont
            facultatifs.
          </li>
          <li>• Les clients déjà enregistrés sont ignorés, leurs points actuels sont conservés.</li>
          <li>• Aucun email n&apos;est envoyé à vos clients lors de l&apos;import.</li>
        </ul>
      </Card>

      <ImportForm disabled={limit !== null} />
    </div>
  );
}

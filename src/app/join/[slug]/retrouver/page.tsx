import { notFound } from "next/navigation";
import Link from "next/link";
import { getBusinessBySlug } from "@/lib/public-data";
import { RecoverForm } from "./recover-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Retrouver ma carte" };

export default async function RecoverCardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getBusinessBySlug(slug);
  if (!data) notFound();

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <h1 className="text-3xl font-semibold tracking-[-0.03em]">Retrouver ma carte</h1>
      <p className="mt-2 text-muted-foreground">
        Indiquez le numéro de téléphone donné lors de votre inscription chez {data.business.name}.
        Vous recevrez le lien de votre carte par email.
      </p>

      <RecoverForm slug={data.business.slug} />

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Pas encore de carte ?{" "}
        <Link href={`/join/${data.business.slug}`} className="font-medium text-accent underline">
          En créer une
        </Link>
      </p>
    </main>
  );
}

import { notFound } from "next/navigation";
import Link from "next/link";
import { getBusinessBySlug } from "@/lib/public-data";
import { JoinForm } from "./join-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getBusinessBySlug(slug);
  return { title: data ? `Rejoindre ${data.business.name}` : "Commerce introuvable" };
}

export default async function JoinPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getBusinessBySlug(slug);
  if (!data) notFound();

  const { business, program } = data;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-10">
      <div className="text-center">
        {business.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- logo externe fourni par le commerçant
          <img
            src={business.logo_url}
            alt=""
            className="mx-auto mb-4 h-20 w-20 rounded-2xl object-cover"
          />
        ) : null}
        <h1 className="text-2xl font-bold">{business.name}</h1>
        <p className="mt-2 text-muted-foreground">Rejoignez notre programme fidélité</p>
        {program ? (
          <p className="mt-4 rounded-xl bg-muted px-4 py-3 font-medium">
            {program.reward_threshold} visites = {program.reward_name}
          </p>
        ) : null}
      </div>

      <JoinForm slug={business.slug} />

      <p className="mt-8 text-center text-xs text-muted-foreground">
        <Link href="/legal/confidentialite" className="underline">
          Politique de confidentialité
        </Link>
        {" · "}
        <Link href="/legal/conditions" className="underline">
          Conditions d&apos;utilisation
        </Link>
        {" · "}
        <Link href="/legal/mentions-legales" className="underline">
          Mentions légales
        </Link>
      </p>
    </main>
  );
}

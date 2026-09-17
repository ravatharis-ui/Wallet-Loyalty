import { notFound } from "next/navigation";
import Link from "next/link";
import { Gift } from "lucide-react";
import { getBusinessBySlug, getReferrerFirstName } from "@/lib/public-data";
import { JoinForm } from "./join-form";
import { readableTextColor, safeCardColor } from "@/lib/colors";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getBusinessBySlug(slug);
  return { title: data ? `Rejoindre ${data.business.name}` : "Commerce introuvable" };
}

export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ p?: string }>;
}) {
  const { slug } = await params;
  const { p: referralCode } = await searchParams;
  const data = await getBusinessBySlug(slug);
  if (!data) notFound();

  const referrerName = referralCode
    ? await getReferrerFirstName(data.business.id, referralCode)
    : null;

  const { business, program, tiers } = data;
  // On n'annonce que la première marche : c'est elle qui décide de l'inscription.
  const cheapest = tiers[0] ?? null;
  const cardColor = safeCardColor(business.card_color);
  const cardText = readableTextColor(cardColor);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-10">
      {/* Le commerce se présente dans ses propres couleurs : le client
          reconnaît la boutique avant de reconnaître Fidelia. */}
      <section
        className="grain relative overflow-hidden rounded-2xl px-6 py-8 text-center shadow-md"
        style={{ background: cardColor, color: cardText }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-28 h-72 w-72 rounded-full opacity-20"
          style={{ background: `radial-gradient(circle, ${cardText} 0%, transparent 70%)` }}
        />
        <div className="relative">
          {business.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- logo externe fourni par le commerçant
            <img
              src={business.logo_url}
              alt=""
              className="mx-auto mb-5 h-20 w-20 rounded-2xl bg-white/90 object-cover"
            />
          ) : null}
          <h1 className="font-display text-4xl leading-none">{business.name}</h1>
          <p className="mt-3 text-sm opacity-80">Rejoignez notre programme de fidélité</p>
          {program && cheapest ? (
            <p
              className="mx-auto mt-6 inline-block rounded-lg px-4 py-2.5 text-sm font-semibold"
              style={{ background: `${cardText}1f`, border: `1px solid ${cardText}3d` }}
            >
              {cheapest.points_cost} {program.mode === "amount" ? "points" : "visites"} ={" "}
              {cheapest.name}
            </p>
          ) : null}
        </div>
      </section>

      {referrerName ? (
        <p className="mt-4 flex items-start gap-2.5 rounded-lg border border-success/20 bg-success-soft px-4 py-3 text-sm leading-relaxed text-success">
          <Gift className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            <strong className="font-semibold">{referrerName}</strong> vous invite
            {program && program.referral_points > 0
              ? ` : vous gagnez ${program.referral_points} points d'avance dès votre première visite.`
              : "."}
          </span>
        </p>
      ) : null}

      <JoinForm slug={business.slug} referral={referrerName ? (referralCode ?? null) : null} />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Vous avez déjà une carte ?{" "}
        <Link
          href={`/join/${business.slug}/retrouver`}
          className="font-medium text-accent underline underline-offset-4"
        >
          La recevoir par email
        </Link>
      </p>

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

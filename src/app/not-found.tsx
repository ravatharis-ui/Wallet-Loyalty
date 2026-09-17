import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/brand";

export const metadata = { title: "Page introuvable" };

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-12 text-center">
      <div className="flex justify-center">
        <Wordmark />
      </div>
      <p className="mt-12 font-display text-7xl leading-none text-muted-foreground">404</p>
      <h1 className="mt-6 text-2xl font-semibold tracking-[-0.025em]">
        Cette page n&apos;existe pas
      </h1>
      <p className="mt-3 leading-relaxed text-muted-foreground">
        Le lien est peut-être incomplet ou périmé. Si vous cherchiez votre carte de fidélité,
        demandez à votre commerçant de vous la renvoyer par email.
      </p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Button asChild>
          <Link href="/">Retour à l&apos;accueil</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/login">Espace commerçant</Link>
        </Button>
      </div>
    </main>
  );
}

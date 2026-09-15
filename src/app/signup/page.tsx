import Link from "next/link";
import { SignupForm } from "./signup-form";
import { TRIAL_DAYS } from "@/lib/pricing";

export const metadata = { title: "Créer un compte" };

export default function SignupPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <Link href="/" className="mb-8 text-lg font-semibold">
        Fidelia
      </Link>
      <h1 className="text-2xl font-bold">Créer votre compte</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {TRIAL_DAYS} jours d&apos;essai. Votre programme de fidélité est prêt en 2 minutes.
      </p>
      <SignupForm />
      <p className="mt-6 text-sm text-muted-foreground">
        Déjà inscrit ?{" "}
        <Link href="/login" className="font-medium text-accent underline">
          Se connecter
        </Link>
      </p>
    </main>
  );
}

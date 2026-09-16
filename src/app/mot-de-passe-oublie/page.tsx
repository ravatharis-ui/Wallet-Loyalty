import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-form";

export const metadata = { title: "Mot de passe oublié" };

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <Link href="/" className="mb-8 text-lg font-semibold">
        Fidelia
      </Link>
      <h1 className="text-2xl font-bold">Mot de passe oublié</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Indiquez votre email : vous recevrez un lien pour choisir un nouveau mot de passe.
      </p>
      <ForgotPasswordForm />
      <p className="mt-6 text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-accent underline">
          Retour à la connexion
        </Link>
      </p>
    </main>
  );
}

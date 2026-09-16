import Link from "next/link";
import { ResetPasswordForm } from "./reset-form";

export const metadata = { title: "Nouveau mot de passe" };

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <Link href="/" className="mb-8 text-lg font-semibold">
        Fidelia
      </Link>
      <h1 className="text-2xl font-bold">Nouveau mot de passe</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Choisissez un mot de passe d&apos;au moins 8 caractères.
      </p>
      <ResetPasswordForm />
    </main>
  );
}

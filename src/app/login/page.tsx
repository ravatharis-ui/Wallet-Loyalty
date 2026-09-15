import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <Link href="/" className="mb-8 text-lg font-semibold">
        Fidelia
      </Link>
      <h1 className="text-2xl font-bold">Connexion</h1>
      <p className="mt-1 text-sm text-muted-foreground">Accédez à votre espace commerçant.</p>
      <Suspense>
        <LoginForm />
      </Suspense>
      <p className="mt-6 text-sm text-muted-foreground">
        Pas encore de compte ?{" "}
        <Link href="/signup" className="font-medium text-accent underline">
          Créer un compte
        </Link>
      </p>
    </main>
  );
}

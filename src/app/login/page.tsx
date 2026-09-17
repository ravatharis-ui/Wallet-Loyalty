import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { AuthShell } from "@/components/auth-shell";

export const metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <AuthShell
      title="Connexion"
      description="Accédez à votre espace commerçant."
      footer={
        <>
          Pas encore de compte ?{" "}
          <Link href="/signup" className="font-medium text-accent underline underline-offset-4">
            Créer un compte
          </Link>
        </>
      }
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}

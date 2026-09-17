import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-form";
import { AuthShell } from "@/components/auth-shell";

export const metadata = { title: "Mot de passe oublié" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Mot de passe oublié"
      description="Indiquez votre email : vous recevrez un lien pour choisir un nouveau mot de passe."
      footer={
        <Link href="/login" className="font-medium text-accent underline underline-offset-4">
          Retour à la connexion
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}

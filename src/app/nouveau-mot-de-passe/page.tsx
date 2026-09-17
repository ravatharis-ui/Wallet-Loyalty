import { ResetPasswordForm } from "./reset-form";
import { AuthShell } from "@/components/auth-shell";

export const metadata = { title: "Nouveau mot de passe" };

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Nouveau mot de passe"
      description="Choisissez un mot de passe d'au moins 8 caractères."
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}

import Link from "next/link";
import { SignupForm } from "./signup-form";
import { AuthShell } from "@/components/auth-shell";
import { TRIAL_DAYS } from "@/lib/pricing";

export const metadata = { title: "Créer un compte" };

export default function SignupPage() {
  return (
    <AuthShell
      title="Créer votre compte"
      description={`${TRIAL_DAYS} jours d'essai, sans carte bancaire. Votre programme de fidélité est prêt en deux minutes.`}
      aside={
        <>
          Vos trois premières cartes sont gratuites, sans limite de durée. Vous ne payez que si le
          programme prend.
        </>
      }
      footer={
        <>
          Déjà inscrit ?{" "}
          <Link href="/login" className="font-medium text-accent underline underline-offset-4">
            Se connecter
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}

import { PRICE_LABEL, TRIAL_DAYS } from "@/lib/pricing";

export const metadata = { title: "Conditions d'utilisation" };

export default function TermsPage() {
  return (
    <>
      <h1 className="text-2xl font-bold">Conditions d&apos;utilisation</h1>

      <h2>1. Objet</h2>
      <p>
        Fidelia fournit aux commerces un service de carte de fidélité digitale : inscription des
        clients par QR code, enregistrement des visites, gestion des récompenses et envoi de
        relances par email.
      </p>

      <h2>2. Ce que Fidelia n&apos;est pas</h2>
      <p>
        Fidelia n&apos;est ni une caisse enregistreuse, ni un système de paiement. Le service
        fonctionne indépendamment du terminal de paiement ou de la caisse utilisés par le commerce.
      </p>

      <h2>3. Compte commerçant</h2>
      <p>
        Le commerçant est responsable de la confidentialité de ses identifiants et de l&apos;usage
        fait de son compte. Il s&apos;engage à n&apos;enregistrer que des clients ayant donné leur
        consentement et à répondre à leurs demandes de suppression.
      </p>

      <h2>4. Abonnement</h2>
      <p>
        L&apos;abonnement est de {PRICE_LABEL} TTC par mois et par commerce, précédé de {TRIAL_DAYS}{" "}
        jours d&apos;essai gratuit. Il est sans engagement et résiliable à tout moment depuis le
        portail de facturation. Aucun remboursement au prorata n&apos;est effectué pour le mois en
        cours. En cas de défaut de paiement, l&apos;accès aux fonctionnalités payantes (envoi
        d&apos;emails et campagnes) est suspendu.
      </p>

      <h2>5. Clients finaux</h2>
      <p>
        Les clients n&apos;ont pas de compte : leur carte est accessible par un lien secret. Ce lien
        ne doit pas être partagé publiquement. Les points et récompenses n&apos;ont aucune valeur
        monétaire et ne peuvent être échangés contre de l&apos;argent.
      </p>

      <h2>6. Disponibilité</h2>
      <p>
        Le service est fourni « en l&apos;état ». Nous mettons tout en œuvre pour assurer sa
        disponibilité mais ne garantissons pas une absence totale d&apos;interruption.
      </p>

      <h2>7. Données personnelles</h2>
      <p>
        Le traitement des données est décrit dans la politique de confidentialité, qui fait partie
        intégrante des présentes conditions.
      </p>
    </>
  );
}

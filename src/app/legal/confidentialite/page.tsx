export const metadata = { title: "Politique de confidentialité" };

export default function PrivacyPage() {
  return (
    <>
      <h1 className="text-2xl font-bold">Politique de confidentialité</h1>
      <p>
        Fidelia est un service de carte de fidélité digitale utilisé par des commerces. Cette page
        explique quelles données sont collectées, pourquoi, et comment les faire supprimer.
      </p>

      <h2>Qui est responsable de vos données ?</h2>
      <p>
        Le commerce auprès duquel vous avez créé votre carte est responsable de traitement. Fidelia
        agit comme sous-traitant : nous hébergeons et traitons les données pour le compte du
        commerce.
      </p>

      <h2>Quelles données sont collectées ?</h2>
      <ul>
        <li>Votre prénom, nécessaire pour vous identifier en caisse.</li>
        <li>
          Votre numéro de téléphone, qui sert d&apos;identifiant de secours si vous perdez votre
          carte.
        </li>
        <li>
          Votre email, facultatif, uniquement si vous souhaitez recevoir vos récompenses et
          relances.
        </li>
        <li>L&apos;historique de vos visites et de vos récompenses dans ce commerce.</li>
      </ul>
      <p>
        Nous ne collectons pas votre date de naissance, votre adresse postale, ni aucune donnée
        bancaire ou sensible. Aucun paiement ne transite par Fidelia côté client.
      </p>

      <h2>Pourquoi ?</h2>
      <p>
        Pour faire fonctionner le programme de fidélité du commerce (comptage des visites,
        attribution des récompenses) et, si vous avez donné votre email, pour vous informer
        qu&apos;une récompense est disponible ou que le commerce souhaite vous revoir.
      </p>

      <h2>Combien de temps ?</h2>
      <p>
        Vos données sont conservées tant que votre carte existe, puis supprimées sur demande. Un
        commerce peut également supprimer votre fiche à tout moment.
      </p>

      <h2>Vos droits</h2>
      <p>
        Vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;opposition et de
        suppression. Pour l&apos;exercer, contactez directement le commerce concerné (ses
        coordonnées figurent en bas de votre carte) ou répondez à l&apos;un de ses emails. La
        suppression efface définitivement votre fiche, vos visites, vos récompenses et votre
        historique d&apos;emails.
      </p>

      <h2>Sous-traitants</h2>
      <ul>
        <li>Supabase — hébergement de la base de données.</li>
        <li>Vercel — hébergement de l&apos;application.</li>
        <li>Resend — envoi des emails.</li>
        <li>Stripe — paiement de l&apos;abonnement du commerçant (aucune donnée client final).</li>
      </ul>
    </>
  );
}

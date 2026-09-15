import { LEGAL_ENTITY } from "@/lib/legal";

export const metadata = { title: "Mentions légales" };

/** Affiche la valeur, ou un repère visible tant qu'elle n'est pas renseignée. */
function Field({ value }: { value: string }) {
  if (!value) {
    return (
      <span className="rounded bg-amber-100 px-1 font-medium text-amber-900">
        à compléter dans src/lib/legal.ts
      </span>
    );
  }
  return <>{value}</>;
}

export default function LegalNoticePage() {
  return (
    <>
      <h1 className="text-2xl font-bold">Mentions légales</h1>

      <h2>Éditeur du site</h2>
      <p>
        <Field value={LEGAL_ENTITY.name} />
        {LEGAL_ENTITY.form ? `, ${LEGAL_ENTITY.form}` : null}
        {LEGAL_ENTITY.capital ? `, au capital de ${LEGAL_ENTITY.capital}` : null}
        <br />
        Siège social : <Field value={LEGAL_ENTITY.address} />
        <br />
        SIRET : <Field value={LEGAL_ENTITY.siret} />
        {LEGAL_ENTITY.vatNumber ? (
          <>
            <br />
            N° TVA intracommunautaire : {LEGAL_ENTITY.vatNumber}
          </>
        ) : null}
        {LEGAL_ENTITY.rcs ? (
          <>
            <br />
            RCS : {LEGAL_ENTITY.rcs}
          </>
        ) : null}
      </p>

      <h2>Directeur de la publication</h2>
      <p>
        <Field value={LEGAL_ENTITY.publisher} />
      </p>

      <h2>Contact</h2>
      <p>
        Email : <Field value={LEGAL_ENTITY.email} />
        {LEGAL_ENTITY.phone ? (
          <>
            <br />
            Téléphone : {LEGAL_ENTITY.phone}
          </>
        ) : null}
      </p>

      <h2>Hébergement</h2>
      <p>
        Le site est hébergé par Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis
        (vercel.com).
        <br />
        Les données sont hébergées par Supabase Inc. dans l&apos;Union européenne.
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        L&apos;ensemble du site, sa structure et ses contenus sont protégés par le droit
        d&apos;auteur. Toute reproduction sans autorisation écrite est interdite.
      </p>

      <h2>Données personnelles</h2>
      <p>
        Le traitement des données est décrit dans la politique de confidentialité. Pour toute
        demande relative à vos données, écrivez à l&apos;adresse de contact ci-dessus ou directement
        au commerce auprès duquel vous avez créé votre carte.
      </p>

      <h2>Médiation de la consommation</h2>
      <p>
        Conformément à l&apos;article L.612-1 du code de la consommation, tout litige non résolu
        amiablement peut être soumis à un médiateur de la consommation.
        {LEGAL_ENTITY.mediator ? ` Médiateur désigné : ${LEGAL_ENTITY.mediator}` : null}
      </p>
    </>
  );
}

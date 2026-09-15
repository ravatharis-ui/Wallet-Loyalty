/**
 * Informations légales de l'éditeur.
 *
 * ⚠️ À compléter avant toute commercialisation : les mentions légales sont
 * obligatoires en France (article 6 de la LCEN). Les champs laissés vides
 * apparaissent en surbrillance sur /legal/mentions-legales, pour qu'un oubli
 * se voie immédiatement.
 */
export const LEGAL_ENTITY = {
  /** Raison sociale, ou nom et prénom pour une entreprise individuelle. */
  name: "",
  /** Forme juridique : « SASU », « micro-entreprise »… */
  form: "",
  /** Capital social, uniquement pour une société. */
  capital: "",
  /** Adresse du siège social. */
  address: "",
  /** Numéro SIRET (14 chiffres). */
  siret: "",
  /** N° TVA intracommunautaire, si assujetti. */
  vatNumber: "",
  /** Ville d'immatriculation au RCS, pour une société. */
  rcs: "",
  /** Directeur de la publication (souvent le dirigeant). */
  publisher: "",
  /** Email de contact publié. */
  email: "",
  /** Téléphone, facultatif. */
  phone: "",
  /** Médiateur de la consommation, une fois adhéré. */
  mediator: "",
} as const;

# Fidelia — carte de fidélité digitale pour les petits commerces

« Une carte de fidélité digitale simple qui aide les commerces à faire revenir leurs clients. »

Le commerçant affiche un QR code. Le client le scanne, renseigne prénom + téléphone
et obtient immédiatement sa carte de fidélité sur son téléphone. À chaque passage,
le commerçant scanne le QR personnel du client et valide une visite en moins de
5 secondes. Au seuil configuré, une récompense devient disponible. Les clients qui
ne reviennent plus reçoivent automatiquement une relance par email.

**Ce n'est pas une caisse ni un système de paiement.** Fidelia fonctionne à côté de
n'importe quel terminal (SumUp, TPE bancaire, espèces, aucune caisse).

Prix : **49 € / mois** par commerce, 14 jours d'essai gratuit.

---

## Stack

Next.js 16 (App Router) · TypeScript strict · Tailwind CSS v4 · Supabase (PostgreSQL,
Auth, RLS) · Stripe (Checkout, Billing, Webhooks) · Resend · Vercel (hébergement + Cron) ·
Vitest · Playwright.

Voir [ARCHITECTURE.md](./ARCHITECTURE.md) pour les décisions techniques et
[TODO.md](./TODO.md) pour l'avancement.

---

## Démarrage local

```bash
pnpm install
cp .env.example .env.local   # puis renseigner les valeurs
pnpm dev
```

### 1. Supabase

1. Créer un projet sur [supabase.com](https://supabase.com).
2. Appliquer les migrations **dans l'ordre**, en copiant chaque fichier de
   `supabase/migrations/` dans le **SQL Editor** (ou `supabase db push` avec la
   CLI liée au projet) :
   - `20260101000000_init.sql` — tables, index, RLS, RPC
   - `20260102000000_card_customisation.sql` — couleur de carte et bucket `logos`
   - `20260103000000_card_delivery.sql` — types de message `welcome` et
     `card_recovery`
   - `20260104000000_loyalty_modes.sql` — modes de fidélité et `add_visit` mis à jour
3. Dans **Authentication → Providers → Email**, activer Email/Password.
   Pour le MVP, désactiver « Confirm email » afin que l'inscription commerçant
   ouvre directement le dashboard (sinon le commerçant doit confirmer son email
   avant de pouvoir se connecter — l'application gère les deux cas).
4. Copier dans `.env.local` : `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY`
   (**la clé service role reste côté serveur, jamais dans le navigateur**).

### 2. Stripe

1. Créer un produit « Fidelia » avec deux tarifs récurrents : **49,90 € / mois**
   et **480 € / an** (payé en une fois). Les montants affichés dans l'application
   viennent de `src/lib/pricing.ts` et doivent correspondre aux tarifs Stripe.
2. Renseigner `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_PRICE_ID_YEARLY`
   et `STRIPE_TRIAL_DAYS=14`. Sans `STRIPE_PRICE_ID_YEARLY`, seule la formule
   mensuelle est proposée.
3. Webhook vers `https://VOTRE-DOMAINE/api/stripe/webhook`, événements :
   `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted`,
   `invoice.payment_failed`. Copier le secret dans `STRIPE_WEBHOOK_SECRET`.

En local : `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

### 3. Resend

Créer une clé API, vérifier le domaine d'envoi, puis renseigner `RESEND_API_KEY`
et `EMAIL_FROM` (`"Fidelia <fidelite@votre-domaine.fr>"`).
Sans ces variables, l'application fonctionne mais les emails ne partent pas
(les messages sont alors tracés en `failed` dans la table `messages`).

### 4. Cron

`CRON_SECRET` doit être une chaîne aléatoire longue. La route
`/api/cron/reminders` n'accepte que `Authorization: Bearer $CRON_SECRET`.
`vercel.json` planifie un appel quotidien à 9 h UTC.

Test manuel :

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/reminders
```

---

## Scripts

| Commande         | Rôle                                            |
| ---------------- | ----------------------------------------------- |
| `pnpm dev`       | Serveur de développement                        |
| `pnpm build`     | Build de production                             |
| `pnpm typecheck` | TypeScript sans émission                        |
| `pnpm lint`      | ESLint                                          |
| `pnpm test`      | Vitest (logique métier + intégration si config) |
| `pnpm test:e2e`  | Playwright (parcours complet)                   |

### Tests

`pnpm test` exécute la logique métier sans dépendance externe (points,
récompenses, relances, abonnement, validation, templates email).

Les suites d'**intégration** (isolation RLS entre commerces, atomicité de
`add_visit`) et le **parcours E2E** s'exécutent seulement si les variables
Supabase sont présentes, sinon ils sont ignorés :

```bash
NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
SUPABASE_SERVICE_ROLE_KEY=... pnpm test

NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
SUPABASE_SERVICE_ROLE_KEY=... pnpm test:e2e
```

> ⚠️ Utiliser un projet Supabase **de test** : ces suites créent et suppriment
> des commerces, des utilisateurs et des clients.

---

## Sauvegardes

Le plan Supabase Free n'inclut aucune sauvegarde automatique.

**Solution retenue** : souscrire au plan **Supabase Pro** au premier client
payant, qui active les sauvegardes quotidiennes automatiques. Tant qu'il n'y a
que des données de test, il n'y a rien à protéger.

Le workflow `.github/workflows/backup.yml` reste disponible comme secours :
`pg_dump` du schéma `public`, compressé et conservé 90 jours dans les artefacts
GitHub. Il n'est **pas planifié** — on le lance à la main depuis l'onglet
Actions, par exemple avant une opération risquée sur la base.

### Mise en place (si utilisé)

1. Supabase → **Project Settings → Database → Connection string** → onglet
   **Session pooler** (et non « Direct connection » : les runners GitHub sont en
   IPv4, la connexion directe ne l'est pas). Copier l'URI et y remplacer
   `[YOUR-PASSWORD]` par le mot de passe de la base.
2. GitHub → dépôt → **Settings → Secrets and variables → Actions → New
   repository secret** :
   - Nom : `SUPABASE_DB_URL`
   - Valeur : l'URI complète
3. Onglet **Actions** → « Sauvegarde base de données » → **Run workflow** pour
   vérifier immédiatement, sans attendre dimanche.

L'archive se télécharge depuis la page du run, section **Artifacts**.

### Restauration

```bash
gunzip -c backup.sql.gz | psql "$SUPABASE_DB_URL"
```

### Limite à connaître

Le dump couvre le schéma `public` : commerces, clients, visites, récompenses,
messages, campagnes, abonnements — c'est-à-dire tout ce qui est irremplaçable.
Il **ne contient pas** le schéma `auth` de Supabase, inaccessible en lecture sur
le plan Free. Après une restauration, les comptes commerçants seraient à
recréer, puis à relier à leur commerce en renseignant `profiles.business_id`.
Les données de fidélité, elles, sont intégralement préservées.

---

## Déploiement (Vercel)

1. Importer le dépôt sur Vercel.
   La **branche de production** se règle dans Settings → Environments → Production →
   Branch Tracking. Elle ne s'applique qu'aux commits poussés _ensuite_ : après
   l'avoir changée, poussez un commit (ou utilisez Redeploy sur un déploiement de
   la bonne branche) pour obtenir un vrai déploiement.
2. Renseigner toutes les variables de `.env.example` dans les settings du projet
   (`NEXT_PUBLIC_APP_URL` = domaine de production). Les `NEXT_PUBLIC_*` sont
   inlinées au build et doivent être de type _Config_ (non sensible) ;
   `SUPABASE_SERVICE_ROLE_KEY` et `CRON_SECRET` sont des secrets serveur.
   Tout changement d'une `NEXT_PUBLIC_*` exige un redéploiement pour être pris
   en compte.
3. Déployer : `vercel.json` active automatiquement le cron quotidien.
4. Pointer le webhook Stripe de production sur le domaine final.
5. Vérifier sur smartphone : inscription client, carte, scanner (la caméra
   exige HTTPS — ce qui est le cas sur Vercel).

---

## Fonctionnement métier

- **Deux modes de fidélité**, au choix du commerçant :
  - _carte à tamponner_ — chaque passage vaut N points, quel que soit le montant ;
  - _points selon le montant_ — le commerçant saisit le montant au scan, et le
    client gagne N points par euro. Seuls les euros entiers comptent : un barème
    au centime serait illisible.

  Dans les deux cas, le seuil atteint consomme les points et crée une récompense ;
  le total de visites est conservé à vie. La carte affiche des pastilles en mode
  tampon, une jauge en mode points.

- **Ajout de visite atomique** via la fonction SQL `add_visit` : vérification
  d'appartenance, verrou sur le client, création de la visite et de la récompense
  dans une seule transaction, plus une fenêtre anti-doublon de 10 secondes contre
  les doubles clics et doubles scans.
- **Trois automatisations**, pas une de plus : relance à 30 jours, relance à
  60 jours, notification de récompense. Aucune relance n'est envoyée deux fois
  pour la même période d'inactivité, et le compteur repart dès que le client revient.
- **Mode découverte** : un commerce sans abonnement utilise tout le produit —
  programme, QR, scan, récompenses, emails — mais ne peut créer que
  `FREE_TIER_CUSTOMER_LIMIT` (3) cartes clients. La limite est vérifiée côté
  serveur à l'inscription publique ; un client déjà inscrit retrouve toujours sa
  carte. L'essai gratuit de 14 jours démarre à la souscription, côté Stripe.
- **Ne pas perdre sa carte** : le `card_token` est le seul moyen pour un client
  de retrouver ses points. Il reçoit donc le lien par email dès l'inscription
  (email de bienvenue), peut ajouter la carte à son écran d'accueil, et se le
  faire renvoyer depuis `/join/[slug]/retrouver` en saisissant son téléphone.
  Cette page répond toujours la même chose, qu'une carte existe ou non : sinon
  un simple numéro permettrait de savoir qui fréquente le commerce.
- **Chiffre d'affaires des clients fidèles** : le commerçant renseigne son panier
  moyen (facultatif), et le tableau de bord affiche `visites du mois × panier
moyen`. C'est une estimation assumée, pas une mesure du gain incrémental : le
  libellé et le détail du calcul restent affichés pour que le chiffre soit
  vérifiable. Rien n'est affiché tant que le panier moyen n'est pas renseigné.
- **Courbe des visites** : le tableau de bord du commerçant affiche ses six
  derniers mois, agrégés en mémoire à partir des seules dates de visite. Les
  mois sans visite restent à zéro — un trou dans la courbe se lirait comme une
  baisse d'activité. Un commerce qui démarre voit un message explicite plutôt
  qu'un graphique vide.
- **Page de démonstration** (`/demo`) : un commerce fictif avec des données
  statiques, hors base, pour montrer à un prospect un compte vivant plutôt qu'un
  tableau de bord vide. Clairement étiquetée comme fictive.
- **Personnalisation** : le commerçant choisit une couleur et téléverse un logo
  (Réglages). La couleur est validée puis la couleur de texte calculée par
  luminance, pour rester lisible quel que soit le fond. Les logos sont stockés
  dans le bucket public `logos`, sous un préfixe `business_id/` ; l'écriture
  passe uniquement par le serveur.
- **Accès payant** : l'envoi d'emails (relances et campagnes) est réservé aux
  commerces dont l'abonnement Stripe est `active` ou `trialing`.
- **Période de grâce** : à l'expiration (essai terminé, impayé, résiliation),
  l'enregistrement des visites continue pendant 7 jours avec un bandeau
  d'avertissement, puis est refusé. Aucune nouvelle carte client n'est créée
  pendant cette période : le commerce sert ses clients mais ne recrute plus. La consultation des clients, des cartes et de
  l'historique reste possible, et rien n'est supprimé : réactiver l'abonnement
  suffit à tout relancer. Objectif : ne jamais couper le comptoir du jour au
  lendemain devant un client qui attend.

## Sécurité

- RLS activée sur toutes les tables, policies basées sur `current_business_id()` :
  un commerçant ne peut ni lire ni écrire les données d'un autre commerce.
- Aucun accès anonyme aux tables : les pages publiques `/join` et `/card` passent
  par le serveur avec un filtre explicite sur le slug ou le `card_token`.
- `card_token` = 16 octets aléatoires (`gen_random_bytes`), jamais d'identifiant
  séquentiel exposé.
- Toutes les entrées sont validées avec Zod côté serveur ; le `business_id` vient
  toujours de la session, jamais du navigateur.
- Webhook Stripe à signature vérifiée, route cron protégée par secret,
  limitation de débit sur l'inscription publique.

## RGPD

Conditions d'utilisation et politique de confidentialité intégrées
(`/legal/conditions`, `/legal/confidentialite`), consentement explicite à
l'inscription, collecte minimale (prénom, téléphone, email facultatif) et
suppression complète d'un client depuis sa fiche (cascade sur visites,
récompenses et messages).

## Hors périmètre du MVP

Paiement client, caisse, comptabilité, inventaire, réservation, application
native, chat, SMS, WhatsApp, Apple/Google Wallet natifs, IA, parrainage,
gamification, multi-commerces par client, API publique, intégrations SumUp /
Stripe Terminal.

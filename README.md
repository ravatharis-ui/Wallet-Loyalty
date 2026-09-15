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
2. Appliquer la migration : copier le contenu de
   `supabase/migrations/20260101000000_init.sql` dans **SQL Editor** et l'exécuter
   (ou `supabase db push` avec la CLI liée au projet).
3. Dans **Authentication → Providers → Email**, activer Email/Password.
   Pour le MVP, désactiver « Confirm email » afin que l'inscription commerçant
   ouvre directement le dashboard (sinon le commerçant doit confirmer son email
   avant de pouvoir se connecter — l'application gère les deux cas).
4. Copier dans `.env.local` : `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY`
   (**la clé service role reste côté serveur, jamais dans le navigateur**).

### 2. Stripe

1. Créer un produit « Fidelia » avec un prix récurrent de **49 € / mois**.
2. Renseigner `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID` et `STRIPE_TRIAL_DAYS=14`.
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

- **1 visite = N points** (configurable), **seuil atteint = 1 récompense**.
  Modèle carte à tamponner : le seuil consomme les points, le total de visites
  est conservé à vie.
- **Ajout de visite atomique** via la fonction SQL `add_visit` : vérification
  d'appartenance, verrou sur le client, création de la visite et de la récompense
  dans une seule transaction, plus une fenêtre anti-doublon de 10 secondes contre
  les doubles clics et doubles scans.
- **Trois automatisations**, pas une de plus : relance à 30 jours, relance à
  60 jours, notification de récompense. Aucune relance n'est envoyée deux fois
  pour la même période d'inactivité, et le compteur repart dès que le client revient.
- **Essai gratuit** : à l'inscription, le commerce reçoit 14 jours d'essai
  (`status = 'trialing'`) sans carte bancaire. Stripe n'est pas nécessaire pour
  démarrer ; dès le premier webhook, c'est Stripe qui devient la source de vérité.
- **Accès payant** : l'envoi d'emails (relances et campagnes) est réservé aux
  commerces dont l'abonnement Stripe est `active` ou `trialing`. Le scan et
  l'enregistrement des visites restent accessibles pour ne jamais bloquer le
  comptoir ; l'application affiche un bandeau d'invitation à régulariser.

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

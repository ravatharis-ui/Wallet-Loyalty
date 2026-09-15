# Architecture — Fidelia (carte de fidélité digitale)

## Objectif

MVP SaaS de fidélité pour petits commerces. Le commerçant affiche un QR code,
le client s'inscrit en 20 secondes et obtient une carte digitale avec un QR
personnel. Le commerçant scanne ce QR pour ajouter une visite. Des relances
automatiques ramènent les clients inactifs.

Prix cible : 49 €/mois par commerce, 14 jours d'essai.

## Stack

| Couche      | Choix                                               |
| ----------- | --------------------------------------------------- |
| Framework   | Next.js 16 (App Router), TypeScript strict          |
| UI          | Tailwind CSS v4 + composants style shadcn/ui        |
| Données     | Supabase (PostgreSQL + Auth + RLS)                  |
| Paiement    | Stripe Checkout + Billing Portal + Webhooks         |
| Email       | Resend                                              |
| Cron        | Vercel Cron -> `/api/cron/reminders` (Bearer token) |
| Tests       | Vitest (logique métier) + Playwright (E2E)          |
| Hébergement | Vercel                                              |

## Arborescence

```
src/
  app/
    page.tsx                     Landing marketing
    login/ signup/               Auth commerçant (email + mot de passe)
    dashboard/                   Espace commerçant (protégé)
      page.tsx                   Statistiques + clients à relancer
      scan/                      Scanner QR client + "+1 visite"
      customers/                 Liste + fiche client
      loyalty/                   Programme de fidélité
      rewards/                   Récompenses disponibles / utilisées
      campaigns/                 Campagnes email manuelles
      settings/                  Commerce, QR d'inscription, abonnement
    join/[slug]/                 Inscription client (public)
    card/[token]/                Carte de fidélité client (public)
    legal/                       CGU + confidentialité
    api/stripe/webhook/          Webhook Stripe (source de vérité abonnement)
    api/cron/reminders/          Relances automatiques (protégé)
  actions/                       Server Actions (toutes les écritures)
  components/                    UI + composants métier
  lib/
    supabase/{server,client,admin,middleware}.ts
    loyalty.ts                   Logique métier pure (testée)
    validation.ts                Schémas Zod
    email/                       Resend + templates
    stripe.ts                    Client Stripe + helpers abonnement
    auth.ts                      requireMerchant() / garde d'accès
supabase/migrations/             SQL versionné (tables, index, RLS, RPC)
tests/                           Vitest
e2e/                             Playwright
```

## Modèle de données

`businesses` — le commerce (tenant).
`profiles` — lie un utilisateur Supabase Auth à un `business_id` + rôle.
Un utilisateur = un commerce au MVP, mais la table permet d'en ajouter d'autres plus tard.
`loyalty_programs` — 1 programme actif par commerce (`points_per_visit`, `reward_threshold`).
`customers` — clients du commerce, identifiés publiquement par `card_token` (32 hex aléatoires).
`visits` — historique immuable des visites.
`rewards` — récompenses gagnées (`available` / `redeemed` / `expired`).
`messages` — trace de chaque email envoyé (sert aussi d'anti-doublon de relance).
`campaigns` — campagnes manuelles.
`subscriptions` — miroir local de l'abonnement Stripe (une ligne par commerce).

## Décisions clés

1. **Isolation multi-commerce par RLS.** Chaque table porte `business_id`. Les
   policies s'appuient sur `public.current_business_id()` (SECURITY DEFINER, lit
   `profiles` pour `auth.uid()`). Un commerçant ne peut donc jamais lire ou écrire
   les données d'un autre commerce, même si une requête applicative oubliait un filtre.

2. **Les clients n'ont pas de compte.** Le `card_token` (32 caractères hex,
   `gen_random_bytes(16)`) est l'unique secret. Les pages publiques `/join` et
   `/card` passent par le client "admin" (service role) côté serveur uniquement,
   avec un filtre explicite sur le token ou le slug — jamais d'accès anonyme direct
   aux tables.

3. **Ajout de visite atomique via RPC PostgreSQL.** `public.add_visit()` fait en une
   transaction : vérification d'appartenance, incrément des points, insertion de la
   visite, création éventuelle de la récompense. Un verrou `FOR UPDATE` sur le client
   plus une fenêtre anti-doublon de 10 secondes empêchent les doubles validations
   (double-clic, double scan).

4. **Le statut d'abonnement vient de Stripe uniquement.** Le webhook écrit dans
   `subscriptions`; l'application lit cette table. Aucune vérification d'accès n'est
   faite côté navigateur. `hasActiveSubscription()` accepte `trialing` et `active`.

5. **Anti-doublon de relance.** Avant d'envoyer `inactive_30_days` /
   `inactive_60_days` / `reward_available`, le cron vérifie qu'aucun message du même
   type n'existe pour ce client depuis sa dernière visite. La table `messages` est
   donc à la fois la trace et le garde-fou.

6. **Pas d'over-engineering.** Pas de queue, pas de Redis, pas d'API publique, pas de
   SMS. Les emails partent en direct depuis la route cron (volumes MVP : quelques
   centaines par jour au maximum).

## Sécurité

- Toutes les entrées sont validées avec Zod côté serveur.
- Toutes les écritures passent par des Server Actions / Route Handlers.
- `requireMerchant()` garantit l'authentification et fournit le `business_id`.
- Le service role n'est jamais importé dans un composant client (`import "server-only"`).
- Le webhook Stripe vérifie la signature; la route cron exige `Authorization: Bearer $CRON_SECRET`.
- Limitation de débit simple en mémoire sur l'inscription client publique.

## Évolutions préparées (hors MVP)

- Apple/Google Wallet : la carte est déjà identifiée par un token stable, il suffira
  d'ajouter une route de génération de pass.
- SMS : `messages.channel` existe déjà, il suffira d'ajouter un provider dans `lib/email/`.
- Plusieurs utilisateurs par commerce : `profiles.role` et la séparation
  `businesses`/`profiles` le permettent sans migration structurelle.

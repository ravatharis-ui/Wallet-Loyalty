# TODO — MVP Fidelia

Statut : `[ ]` à faire · `[x]` terminé

## PHASE 1 — Initialisation

- [x] Next.js + TypeScript strict + Tailwind + composants shadcn-like
- [x] ESLint + Prettier
- [x] Vitest + Playwright
- [x] README.md, ARCHITECTURE.md, TODO.md, .env.example

## PHASE 2 — Base de données

- [x] Migration SQL : tables, index, contraintes
- [x] RLS sur toutes les tables + helper `current_business_id()`
- [x] RPC `add_visit` (atomique, anti-doublon)
- [x] Types TypeScript générés à la main (`lib/db.types.ts`)

## PHASE 3 — Authentification commerçant

- [x] Signup (crée business + profile + programme par défaut)
- [x] Login / logout
- [x] Middleware de session + garde `requireMerchant()`

## PHASE 4 — Programme de fidélité

- [x] Page `/dashboard/loyalty` (création / modification / activation)

## PHASE 5 — Inscription client

- [x] `/join/[slug]` + consentement RGPD
- [x] Création client + `card_token`
- [x] `/card/[token]` avec QR personnel + PWA

## PHASE 6 — Scanner commerçant

- [x] `/dashboard/scan` (caméra, lookup serveur, +1 visite)

## PHASE 7 — Récompenses

- [x] Génération automatique au franchissement du seuil
- [x] `/dashboard/rewards` + utilisation avec confirmation

## PHASE 8 — Dashboard

- [x] Statistiques (clients, visites du mois, récompenses, à relancer)
- [x] `/dashboard/customers` + filtres + recherche
- [x] Fiche client + historique + suppression RGPD

## PHASE 9 — Relances automatiques

- [x] Resend + templates
- [x] Cron protégé `/api/cron/reminders`
- [x] Relances 30 j, 60 j, récompense disponible (sans doublon)

## PHASE 10 — Campagnes

- [x] `/dashboard/campaigns` (audience, compte destinataires, envoi)

## PHASE 11 — Stripe

- [x] Checkout 49 €/mois + essai 14 jours
- [x] Customer portal
- [x] Webhooks + table `subscriptions`
- [x] Accès conditionné à l'abonnement

## PHASE 12 — Sécurité + tests

- [x] Audit RLS / permissions / validation / secrets
- [x] Tests Vitest (logique métier, permissions, abonnement)
- [x] E2E Playwright du parcours complet

## PHASE 13 — Déploiement

- [x] Documentation de déploiement (Vercel, Supabase, Stripe, Resend)
- [x] Vérification build production

---

## État au terme du MVP

Toutes les phases sont implémentées. Points à traiter avant la mise en production
réelle :

- Appliquer la migration sur un projet Supabase et lancer les suites
  d'intégration + E2E (elles sont ignorées sans variables d'environnement).
- Créer le produit Stripe 49 €/mois et brancher le webhook de production.
- Vérifier le domaine d'envoi Resend.
- Sentry et PostHog volontairement non intégrés au MVP (voir ARCHITECTURE.md) :
  à ajouter quand les premiers commerçants payants seront en place.

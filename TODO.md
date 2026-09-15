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

## État — MVP déployé et validé en production

Déployé sur Vercel (`wallet-loyalty-phi.vercel.app`), base Supabase migrée avec
RLS active sur les 9 tables.

**Parcours vérifié manuellement de bout en bout** : inscription commerçant →
programme de fidélité → QR d'inscription → inscription client → carte digitale
avec QR personnel → scan par le commerçant → ajout d'une visite.

### Reste à faire

- [ ] **Resend** : brancher la clé API et vérifier le domaine d'envoi. Sans cela
      les relances 30/60 jours et la notification de récompense sont créées en
      base avec le statut `failed` au lieu d'être envoyées.
- [ ] **Stripe** : produit 49 €/mois, webhook de production. En attendant, chaque
      commerce démarre avec 14 jours d'essai accordés localement.
- [ ] **Suites d'intégration et E2E** : écrites mais jamais exécutées contre une
      base réelle (isolation RLS entre commerces, atomicité de `add_visit`,
      parcours Playwright). À lancer sur un projet Supabase de test.
- [ ] **Sauvegardes Supabase** : absentes sur le plan Free. À régler avant
      d'héberger les données de vrais clients.
- [ ] Sentry / PostHog : volontairement hors MVP (voir ARCHITECTURE.md).

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

## État — MVP complet et en production

Déployé sur Vercel (`wallet-loyalty-phi.vercel.app`), base Supabase migrée avec
RLS active sur les 9 tables.

**Vérifié manuellement en production :**

- Parcours complet : inscription commerçant → programme → QR d'inscription →
  inscription client → carte digitale → scan → ajout de visite
- Stripe en mode test : Checkout, abonnement, portail client, webhook (200 sur
  tous les événements), statut d'abonnement remonté dans l'application
- Resend (domaine bac à sable) : relance d'inactivité reçue, cron protégé par
  `CRON_SECRET`

### Reste à faire

- [ ] **Stripe en mode live** : produit, tarif, clé et webhook sont à recréer en
      live, et les 4 variables à remplacer. Rien du mode test n'est réutilisable.
- [ ] **Domaine d'envoi Resend** : le bac à sable `onboarding@resend.dev`
      n'envoie qu'à l'adresse du compte. Vérifier un domaine avant de démarcher.
- [ ] **Harmoniser le prix** : Stripe est à 49,90 €, l'application affiche 49 €
      en dur (landing, réglages, conditions d'utilisation).
- [ ] **Nom de domaine** : `fidelia.fr` plutôt que `*.vercel.app` pour la vente.
- [ ] **Suites d'intégration et E2E** : écrites mais jamais exécutées contre une
      base réelle. À lancer sur un projet Supabase de test.
- [ ] **Sauvegardes Supabase** : absentes sur le plan Free. À régler avant
      d'héberger les données de vrais clients.
- [ ] Canal SMS : l'architecture est prête (`messages.channel` accepte `'sms'`).
      Le téléphone est obligatoire à l'inscription, l'email non — meilleure
      couverture. À faire après le premier client payant.
- [ ] Sentry / PostHog : volontairement hors MVP (voir ARCHITECTURE.md).

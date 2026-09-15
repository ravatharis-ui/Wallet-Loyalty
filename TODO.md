# TODO — MVP Fidelia

Statut : `[ ]` à faire · `[x]` terminé

## PHASE 1 — Initialisation
- [ ] Next.js + TypeScript strict + Tailwind + composants shadcn-like
- [ ] ESLint + Prettier
- [ ] Vitest + Playwright
- [ ] README.md, ARCHITECTURE.md, TODO.md, .env.example

## PHASE 2 — Base de données
- [ ] Migration SQL : tables, index, contraintes
- [ ] RLS sur toutes les tables + helper `current_business_id()`
- [ ] RPC `add_visit` (atomique, anti-doublon)
- [ ] Types TypeScript générés à la main (`lib/db.types.ts`)

## PHASE 3 — Authentification commerçant
- [ ] Signup (crée business + profile + programme par défaut)
- [ ] Login / logout
- [ ] Middleware de session + garde `requireMerchant()`

## PHASE 4 — Programme de fidélité
- [ ] Page `/dashboard/loyalty` (création / modification / activation)

## PHASE 5 — Inscription client
- [ ] `/join/[slug]` + consentement RGPD
- [ ] Création client + `card_token`
- [ ] `/card/[token]` avec QR personnel + PWA

## PHASE 6 — Scanner commerçant
- [ ] `/dashboard/scan` (caméra, lookup serveur, +1 visite)

## PHASE 7 — Récompenses
- [ ] Génération automatique au franchissement du seuil
- [ ] `/dashboard/rewards` + utilisation avec confirmation

## PHASE 8 — Dashboard
- [ ] Statistiques (clients, visites du mois, récompenses, à relancer)
- [ ] `/dashboard/customers` + filtres + recherche
- [ ] Fiche client + historique + suppression RGPD

## PHASE 9 — Relances automatiques
- [ ] Resend + templates
- [ ] Cron protégé `/api/cron/reminders`
- [ ] Relances 30 j, 60 j, récompense disponible (sans doublon)

## PHASE 10 — Campagnes
- [ ] `/dashboard/campaigns` (audience, compte destinataires, envoi)

## PHASE 11 — Stripe
- [ ] Checkout 49 €/mois + essai 14 jours
- [ ] Customer portal
- [ ] Webhooks + table `subscriptions`
- [ ] Accès conditionné à l'abonnement

## PHASE 12 — Sécurité + tests
- [ ] Audit RLS / permissions / validation / secrets
- [ ] Tests Vitest (logique métier, permissions, abonnement)
- [ ] E2E Playwright du parcours complet

## PHASE 13 — Déploiement
- [ ] Documentation de déploiement (Vercel, Supabase, Stripe, Resend)
- [ ] Vérification build production

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

- Personnalisation de la carte (couleur, logo), mot de passe oublié de bout en
  bout, et limite de 3 cartes du mode découverte

- Parcours complet : inscription commerçant → programme → QR d'inscription →
  inscription client → carte digitale → scan → ajout de visite
- Stripe en mode test : Checkout, abonnement, portail client, webhook (200 sur
  tous les événements), statut d'abonnement remonté dans l'application
- Resend (domaine bac à sable) : relance d'inactivité reçue, cron protégé par
  `CRON_SECRET`

### 🔴 Bloquant — avant d'encaisser le premier euro

- [ ] **Plan Vercel Pro** (~20 $/mois) — décision : reporté au premier client
      payant. Le plan Hobby interdit l'usage commercial : à basculer le jour où
      vous facturez, pas avant.
- [x] ~~Structure juridique~~ : HERA 1, EURL immatriculée au RCS de Saint-Denis.
- [x] ~~Mentions légales~~ : renseignées dans `src/lib/legal.ts`.
- [x] ~~Stripe en mode live~~ : compte activé, produit et les deux tarifs
      récurrents (49,90 €/mois, 480 €/an), webhook et 5 variables en place.
      Paiement réel validé.
      À confirmer si ce n'est pas déjà fait : portail client activé **en live**
      (réglage distinct du mode test) et nom public « FIDELIA » sur le relevé
      bancaire.
- [ ] **Nom de domaine (~7 €/an) + vérification Resend** — décision : reporté
      après la première signature. La démonstration n'en a pas besoin, et les QR
      imprimés sur l'adresse `*.vercel.app` continueront de fonctionner même
      après l'ajout d'un domaine (Vercel conserve les deux).
      ⚠️ Tant qu'il n'est pas en place, **aucune relance ne part vers de vrais
      clients** : le bac à sable Resend n'écrit qu'à l'adresse du compte. À acheter
      le jour même de la signature, avant d'installer le commerce, car la
      propagation DNS prend quelques heures.
      Pour démontrer les relances en attendant : inscrivez-vous comme client de
      test avec votre propre adresse et montrez l'email reçu.

### 🟠 Avant de confier de vraies données

- [ ] **Sauvegardes — plan Supabase Pro au premier client payant** (décision :
      plus simple qu'un secret à gérer). Sauvegardes quotidiennes automatiques.
      Un workflow GitHub Actions de secours existe, non planifié, lançable à la
      main après création du secret `SUPABASE_DB_URL` (voir README).
- [x] ~~Vérifier l'isolation entre commerces~~ — fait **manuellement** : deux
      commerces créés, cinq tentatives d'accès croisé (liste clients, fiche par
      URL directe, recherche par téléphone, scan du QR d'un client d'un autre
      commerce, récompenses et campagnes) toutes refusées comme attendu.
- [ ] **Suites d'intégration et E2E automatisées** — écrites, jamais exécutées
      faute d'un projet Supabase de test. Non bloquant avec un seul commerce.
      À lancer avant d'en installer plusieurs, ou après toute modification
      touchant les permissions. Commandes dans le README.
- [ ] **Nettoyer les données de test** avant d'installer un vrai commerce.

### ⚙️ À appliquer sur Supabase

- [x] ~~Migration `20260106000000_referral_guards.sql`~~ : garde-fous du
      parrainage (achat minimum, plafond mensuel), appliquée.

- [x] ~~Migration `20260105000000_referral.sql`~~ : parrainage, appliquée.

- [x] ~~Migration `20260104000000_loyalty_modes.sql`~~ : modes de fidélité,
      appliquée et vérifiée (scan et points fonctionnent).

- [ ] **Migration `20260103000000_card_delivery.sql`** : types de message
      `welcome` et `card_recovery`. Sans elle, l'email de bienvenue et le renvoi
      de carte échouent à l'enregistrement (contrainte `messages_type_check`).

- [x] ~~Migration `20260102000000_card_customisation.sql`~~ : appliquée et
      vérifiée (colonne `card_color`, bucket `logos` public).
- [x] ~~Redirect URL `/auth/callback`~~ : ajoutée et vérifiée.

### 🟡 À clarifier

- [ ] **TVA** : les CGU annoncent « TTC ». À confirmer avec le comptable
      (8,5 % à La Réunion, régime du preneur pour les clients métropole), puis
      ajuster le libellé dans `src/lib/pricing.ts`.
- [ ] **Contrat de sous-traitance (DPA)** à faire signer par chaque commerçant
      (RGPD art. 28).
- [ ] Médiateur de la consommation : adhésion puis renseigner `legal.ts`.
- [ ] Remplacer l'email Gmail des mentions légales par une adresse du domaine.

### 🟢 Après le premier client payant

- [ ] **Canal SMS** : téléphone et email sont tous deux obligatoires depuis la
      refonte de l'inscription ; le SMS reste un canal de secours si la
      délivrabilité email déçoit. L'architecture est prête (`messages.channel`
      accepte déjà `'sms'`). Une demi-journée.
- [ ] Sentry / PostHog : volontairement hors MVP (voir ARCHITECTURE.md).
- [ ] WhatsApp : seulement si un commerçant le réclame. Vérification Meta,
      templates pré-approuvés, facturation à la conversation.

### 💰 Économie

Vercel Pro (~20 $) + Supabase Pro (~25 $) + domaine (~1 €/mois) ≈ **45 €/mois de
coûts fixes**. Le premier client à 49,90 € met à l'équilibre, le deuxième
commence à dégager de la marge.

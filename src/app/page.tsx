import Link from "next/link";
import { ScanLine, Smartphone, Gift, MailCheck, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/brand";
import { LoyaltyCardPreview } from "@/components/loyalty-card-preview";
import {
  PRICE_LABEL,
  PRICE_YEARLY_LABEL,
  PRICE_YEARLY_PER_MONTH_LABEL,
  TRIAL_DAYS,
  YEARLY_FREE_MONTHS,
} from "@/lib/pricing";

const steps = [
  {
    icon: ScanLine,
    title: "Vous affichez un QR code sur le comptoir",
    text: "Une affichette à imprimer, fournie avec votre compte. C'est la seule installation.",
  },
  {
    icon: Smartphone,
    title: "Votre client crée sa carte en vingt secondes",
    text: "Prénom, téléphone, email. Rien à télécharger : la carte s'ouvre dans son navigateur et il l'ajoute à son écran d'accueil.",
  },
  {
    icon: Gift,
    title: "Vous scannez, la récompense se déclenche seule",
    text: "Vous ouvrez le scanner depuis votre téléphone, vous validez. Au seuil que vous avez fixé, la récompense apparaît des deux côtés.",
  },
  {
    icon: MailCheck,
    title: "Les clients qui ne reviennent plus sont relancés",
    text: "Un email part automatiquement après 30 jours sans visite, un second après 60. Vous n'y touchez pas.",
  },
];

const included = [
  "Clients, visites et récompenses illimités",
  "Carte digitale à vos couleurs, avec votre logo",
  "Scanner depuis votre téléphone, sans matériel",
  "Relances automatiques à 30 et 60 jours",
  "Campagnes email vers vos clients",
  "Import de votre fichier clients actuel",
  "Parrainage entre clients, avec garde-fous",
];

const objections = [
  {
    question: "Faut-il changer de caisse ?",
    answer:
      "Non. Fidelia ne se connecte à aucune caisse et ne voit aucun paiement. Vous scannez depuis votre téléphone, en parallèle de ce que vous faites déjà.",
  },
  {
    question: "Et les clients qui n'ont pas de smartphone ?",
    answer:
      "Vous pouvez les retrouver par prénom ou par téléphone depuis votre espace, et enregistrer la visite sans scanner quoi que ce soit.",
  },
  {
    question: "Qui possède les données de mes clients ?",
    answer:
      "Vous. Elles ne sont ni revendues ni partagées, aucun autre commerce n'y a accès, et un client peut demander leur suppression complète à tout moment.",
  },
  {
    question: "Je peux arrêter quand je veux ?",
    answer: `Oui. Pas d'engagement, résiliation en un clic depuis votre espace. Les ${TRIAL_DAYS} premiers jours sont gratuits et sans carte bancaire.`,
  },
];

export default function HomePage() {
  return (
    <div className="min-h-dvh">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-foreground focus:px-4 focus:py-2 focus:text-background"
      >
        Aller au contenu
      </a>

      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <Wordmark />
          <nav className="flex items-center gap-1.5">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/demo">Démonstration</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Connexion</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">Essayer gratuitement</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main id="contenu">
        {/* ---------------------------------------------------------------- */}
        <section className="mx-auto max-w-6xl px-5 pb-20 pt-16 sm:pt-24">
          <div className="grid items-center gap-14 lg:grid-cols-12 lg:gap-8">
            <div className="animate-rise lg:col-span-7">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Pour les commerces de proximité
              </p>
              <h1 className="mt-5 max-w-[15ch] text-[2.75rem] font-semibold leading-[0.98] tracking-[-0.035em] sm:text-6xl">
                Vos clients reviennent.{" "}
                <span className="font-display font-normal italic text-accent">Sans y penser.</span>
              </h1>
              <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-muted-foreground">
                La carte de fidélité de votre commerce, sur le téléphone de vos clients. Vous
                scannez, Fidelia compte les visites et rappelle à ceux qui s&apos;éloignent que vous
                existez.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/signup">
                    Essayer gratuitement
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/demo">Voir une démonstration</Link>
                </Button>
              </div>
              <p className="mt-5 text-sm text-muted-foreground">
                {TRIAL_DAYS} jours gratuits, sans carte bancaire · Sans engagement · Aucun matériel
                à acheter
              </p>
            </div>

            {/* La carte penchée : on montre le produit, pas une illustration. */}
            <div className="animate-rise lg:col-span-5 [animation-delay:120ms]">
              <div className="relative mx-auto max-w-[24rem]">
                <div
                  aria-hidden
                  className="absolute left-1/2 top-1/2 -z-10 h-[130%] w-[130%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,var(--color-muted)_0%,transparent_68%)]"
                />
                <LoyaltyCardPreview
                  businessName="Boulangerie Ti Pain"
                  firstName="Marlène"
                  points={7}
                  threshold={10}
                  color="#8c4a2f"
                  rewardName="une viennoiserie offerte"
                  className="rotate-[-1.5deg] p-7"
                />
                <p className="mt-7 text-center text-sm text-muted-foreground">
                  Ce que votre client garde dans sa poche.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        <section id="fonctionnement" className="border-t border-border bg-surface">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-4">
              <h2 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                Quatre gestes, et c&apos;est tout
              </h2>
              <p className="mt-4 max-w-[38ch] leading-relaxed text-muted-foreground">
                Le programme tourne ensuite sans vous. Comptez deux minutes pour le régler la
                première fois.
              </p>
            </div>

            <ol className="lg:col-span-8">
              {steps.map((step, index) => (
                <li
                  key={step.title}
                  className="relative grid grid-cols-[3.5rem_1fr] gap-x-5 pb-10 last:pb-0"
                >
                  {/* Filet de liaison : la séquence se lit sans numéroter deux fois. */}
                  {index < steps.length - 1 ? (
                    <span
                      aria-hidden
                      className="absolute left-[1.6875rem] top-12 h-[calc(100%-2.5rem)] w-px bg-border"
                    />
                  ) : null}
                  <span className="relative flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-background">
                    <step.icon className="h-5 w-5 text-accent" aria-hidden />
                  </span>
                  <div className="pt-2.5">
                    <h3 className="text-lg font-semibold tracking-[-0.015em]">{step.title}</h3>
                    <p className="mt-2 max-w-[58ch] leading-relaxed text-muted-foreground">
                      {step.text}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        <section id="prix" className="border-t border-border">
          <div className="mx-auto grid max-w-6xl items-start gap-12 px-5 py-20 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-6">
              <h2 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                Un seul tarif, tout compris
              </h2>
              <p className="mt-4 max-w-[46ch] leading-relaxed text-muted-foreground">
                Pas de palier, pas de supplément au nombre de clients, pas de frais
                d&apos;ouverture. Le prix ne bouge pas quand votre fichier grossit.
              </p>

              <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {included.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm leading-relaxed">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-6 lg:pl-8">
              <div className="rounded-card border border-border bg-surface p-7 shadow-md">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-semibold tracking-[-0.04em]">{PRICE_LABEL}</span>
                  <span className="text-muted-foreground">par mois</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {TRIAL_DAYS} jours gratuits, sans carte bancaire.
                </p>

                <div className="mt-6 rounded-lg bg-muted p-4 text-sm leading-relaxed">
                  <strong className="font-semibold">
                    Ou {PRICE_YEARLY_LABEL} pour l&apos;année
                  </strong>{" "}
                  — soit {PRICE_YEARLY_PER_MONTH_LABEL} par mois, {YEARLY_FREE_MONTHS} mois offerts.
                </div>

                <Button asChild size="lg" className="mt-6 w-full">
                  <Link href="/signup">Commencer l&apos;essai gratuit</Link>
                </Button>
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Résiliable en un clic, à tout moment.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        <section className="border-t border-border bg-surface">
          <div className="mx-auto max-w-6xl px-5 py-20">
            <h2 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
              Les questions qu&apos;on nous pose
            </h2>
            <dl className="mt-10 grid gap-x-16 gap-y-9 sm:grid-cols-2">
              {objections.map((item) => (
                <div key={item.question}>
                  <dt className="font-semibold tracking-[-0.01em]">{item.question}</dt>
                  <dd className="mt-2 max-w-[54ch] leading-relaxed text-muted-foreground">
                    {item.answer}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-5 py-12">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Wordmark />
              <p className="mt-3 max-w-[34ch] text-sm leading-relaxed text-muted-foreground">
                Édité par HERA 1, à Saint-André, La Réunion.
              </p>
            </div>
            <nav className="flex flex-col gap-2.5 text-sm">
              <Link href="/demo" className="text-muted-foreground hover:text-foreground">
                Démonstration
              </Link>
              <Link
                href="/legal/mentions-legales"
                className="text-muted-foreground hover:text-foreground"
              >
                Mentions légales
              </Link>
              <Link
                href="/legal/conditions"
                className="text-muted-foreground hover:text-foreground"
              >
                Conditions d&apos;utilisation
              </Link>
              <Link
                href="/legal/confidentialite"
                className="text-muted-foreground hover:text-foreground"
              >
                Confidentialité
              </Link>
            </nav>
          </div>
          <p className="mt-10 border-t border-border pt-6 text-sm text-muted-foreground">
            © {new Date().getFullYear()} Fidelia
          </p>
        </div>
      </footer>
    </div>
  );
}

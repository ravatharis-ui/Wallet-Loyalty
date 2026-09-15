import Link from "next/link";
import { QrCode, Smartphone, Zap, MailCheck, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PRICE_LABEL,
  PRICE_YEARLY_LABEL,
  PRICE_YEARLY_PER_MONTH_LABEL,
  TRIAL_DAYS,
  YEARLY_FREE_MONTHS,
} from "@/lib/pricing";

const steps = [
  {
    icon: QrCode,
    title: "Vos clients scannent un QR code",
    text: "Affiché sur votre comptoir. Aucune application à installer.",
  },
  {
    icon: Smartphone,
    title: "Ils obtiennent leur carte digitale",
    text: "Prénom, téléphone, et c'est tout. Leur carte est sur leur téléphone.",
  },
  {
    icon: Zap,
    title: "Vous ajoutez une visite en quelques secondes",
    text: "Vous scannez leur QR personnel, un bouton, c'est enregistré.",
  },
  {
    icon: MailCheck,
    title: "Nous faisons revenir les clients absents",
    text: "Relances automatiques par email à 30 et 60 jours sans visite.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <span className="text-lg font-semibold">Fidelia</span>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Connexion</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Essayer gratuitement</Link>
          </Button>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-5">
        <section className="py-14 sm:py-24">
          <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Faites revenir vos clients automatiquement.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">
            Carte de fidélité digitale + relances automatiques pour les petits commerces.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/signup">Essayer gratuitement</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="#fonctionnement">Voir comment ça marche</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            {TRIAL_DAYS} jours gratuits · Sans engagement · Fonctionne avec votre caisse actuelle
          </p>
        </section>

        <section id="fonctionnement" className="border-t border-border py-14">
          <h2 className="text-2xl font-bold">Comment ça marche</h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-2">
            {steps.map((step, index) => (
              <li key={step.title} className="rounded-2xl border border-border p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                    <step.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">
                    Étape {index + 1}
                  </span>
                </div>
                <h3 className="mt-4 font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="prix" className="border-t border-border py-14">
          <h2 className="text-2xl font-bold">Un prix simple</h2>
          <div className="mt-8 max-w-md rounded-2xl border border-border p-6 shadow-sm">
            <p className="text-4xl font-bold">
              {PRICE_LABEL}{" "}
              <span className="text-base font-normal text-muted-foreground">/ mois</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {TRIAL_DAYS} jours gratuits, sans engagement.
            </p>
            <p className="mt-4 rounded-xl bg-muted px-4 py-3 text-sm">
              <strong>Ou {PRICE_YEARLY_LABEL} par an</strong>, payés en une fois — soit{" "}
              {PRICE_YEARLY_PER_MONTH_LABEL} par mois, {YEARLY_FREE_MONTHS} mois offerts.
            </p>
            <ul className="mt-6 space-y-2 text-sm">
              {[
                "Clients et visites illimités",
                "Carte de fidélité digitale",
                "Scanner depuis votre téléphone",
                "Relances automatiques par email",
                "Campagnes email",
                "Support par email",
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" aria-hidden />
                  {feature}
                </li>
              ))}
            </ul>
            <Button asChild size="lg" className="mt-6 w-full">
              <Link href="/signup">Commencer l&apos;essai gratuit</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} Fidelia</span>
          <nav className="flex gap-4">
            <Link href="/legal/mentions-legales" className="underline">
              Mentions légales
            </Link>
            <Link href="/legal/conditions" className="underline">
              Conditions d&apos;utilisation
            </Link>
            <Link href="/legal/confidentialite" className="underline">
              Confidentialité
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

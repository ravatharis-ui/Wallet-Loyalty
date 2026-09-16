import Link from "next/link";
import {
  QrCode,
  ScanLine,
  Gift,
  MailCheck,
  Users,
  Megaphone,
  Palette,
  Upload,
  CreditCard,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FREE_TIER_CUSTOMER_LIMIT, SUBSCRIPTION_GRACE_DAYS } from "@/lib/loyalty";
import { TRIAL_DAYS } from "@/lib/pricing";
import { LEGAL_ENTITY } from "@/lib/legal";

/** Étape numérotée du démarrage. */
function Step({
  number,
  title,
  children,
  href,
  action,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
  href: string;
  action: string;
}) {
  return (
    <Card className="flex flex-col">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
        {number}
      </span>
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-1 flex-1 text-sm text-muted-foreground">{children}</p>
      <Button asChild variant="outline" size="sm" className="mt-4 self-start">
        <Link href={href}>{action}</Link>
      </Button>
    </Card>
  );
}

/** Bloc thématique, icône à gauche pour repérer la section d'un coup d'œil. */
function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Gift;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="flex gap-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <h3 className="font-semibold">{title}</h3>
        <div className="mt-1 space-y-2 text-sm text-muted-foreground">{children}</div>
      </div>
    </Card>
  );
}

/** Question dépliable — sans JavaScript, l'élément natif suffit. */
function Question({ question, children }: { question: string; children: React.ReactNode }) {
  return (
    <details className="group border-b border-border last:border-0">
      <summary className="cursor-pointer list-none py-4 pr-8 font-medium marker:content-none">
        <span className="relative block">
          {question}
          <span
            aria-hidden
            className="absolute right-0 top-1 text-muted-foreground transition-transform group-open:rotate-45"
          >
            +
          </span>
        </span>
      </summary>
      <div className="pb-4 text-sm text-muted-foreground">{children}</div>
    </details>
  );
}

/** Contenu du guide, sans dépendance à la session : rendu et vérifiable seul. */
export function HelpContent({ joinUrl }: { joinUrl: string }) {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Guide de prise en main</h1>
        <p className="mt-1 text-muted-foreground">
          Tout ce qu&apos;il faut savoir pour faire revenir vos clients. Comptez cinq minutes.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="font-semibold">Démarrer en 3 étapes</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Step
            number={1}
            title="Réglez votre programme"
            href="/dashboard/loyalty"
            action="Configurer"
          >
            Choisissez ce que vos clients gagnent et au bout de combien. Par exemple : 10 visites =
            1 café offert.
          </Step>
          <Step
            number={2}
            title="Affichez votre QR code"
            href="/dashboard/settings#qr"
            action="Imprimer"
          >
            Imprimez l&apos;affichette et posez-la sur votre comptoir. Vos clients la scannent pour
            créer leur carte.
          </Step>
          <Step number={3} title="Scannez vos clients" href="/dashboard/scan" action="Scanner">
            À chaque passage, scannez la carte du client depuis votre téléphone. Une visite est
            enregistrée en quelques secondes.
          </Step>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Comment tout fonctionne</h2>

        <Section icon={QrCode} title="Vos clients s'inscrivent seuls">
          <p>
            Ils scannent votre QR code, renseignent prénom, téléphone et email, et leur carte
            apparaît aussitôt sur leur téléphone. Aucune application à installer.
          </p>
          <p>
            Votre page d&apos;inscription : <code className="break-all">{joinUrl}</code>
          </p>
        </Section>

        <Section icon={ScanLine} title="Deux façons de récompenser">
          <p>
            <strong>Carte à tamponner</strong> — chaque passage vaut un tampon, quel que soit le
            montant. Rien à saisir, c&apos;est le plus rapide au comptoir.
          </p>
          <p>
            <strong>Points selon le montant</strong> — vous saisissez le montant de l&apos;achat au
            moment du scan, et le client gagne des points proportionnels. Adapté quand vos prix
            varient beaucoup.
          </p>
        </Section>

        <Section icon={Gift} title="Les récompenses se déclenchent seules">
          <p>
            Dès qu&apos;un client atteint le seuil, sa récompense apparaît sur sa carte et dans
            votre onglet Récompenses. Vous la marquez comme utilisée d&apos;un clic quand il en
            profite — elle ne peut pas être utilisée deux fois.
          </p>
        </Section>

        <Section icon={MailCheck} title="Les clients absents sont relancés">
          <p>
            Un client qui n&apos;est pas revenu depuis 30 jours reçoit automatiquement un email, et
            un second après 60 jours. Vous n&apos;avez rien à faire.
          </p>
          <p>
            Un même client ne reçoit jamais deux fois la même relance, et le compteur repart dès
            qu&apos;il revient.
          </p>
        </Section>

        <Section icon={Users} title="Vos clients vous en amènent d'autres">
          <p>
            Si vous réglez un <strong>bonus de parrainage</strong> dans votre programme, chaque
            client peut partager son lien. Le bonus est versé au parrain et au filleul{" "}
            <strong>quand le filleul passe en boutique</strong> — jamais à la simple inscription,
            pour qu&apos;un faux compte ne rapporte rien.
          </p>
          <p>
            Deux réglages dans Fidélité limitent les abus : un <strong>achat minimum</strong> du
            filleul (le bonus attend le premier passage qui l&apos;atteint) et un{" "}
            <strong>plafond de parrainages par client sur 30 jours</strong>. Laissez-les à zéro si
            vous préférez ne rien imposer.
          </p>
        </Section>

        <Section icon={Megaphone} title="Vous pouvez écrire à vos clients">
          <p>
            Depuis Campagnes, envoyez un email à tous vos clients, à ceux absents depuis 30 jours,
            ou à ceux qui ont une récompense en attente. Le nombre de destinataires s&apos;affiche
            avant l&apos;envoi.
          </p>
        </Section>

        <Section icon={Upload} title="Vous gardez votre fichier actuel">
          <p>
            Vous avez déjà un carnet ou un tableur ? Importez-le depuis Clients → Importer un
            fichier. Vos clients conservent les points déjà acquis, et aucun email ne leur est
            envoyé à ce moment-là.
          </p>
        </Section>

        <Section icon={Palette} title="La carte est à vos couleurs">
          <p>
            Dans Réglages, choisissez une couleur et ajoutez votre logo. Vos clients voient votre
            enseigne sur leur carte et sur votre page d&apos;inscription.
          </p>
        </Section>

        <Section icon={CreditCard} title="Votre abonnement">
          <p>
            Sans abonnement, vous découvrez tout le produit avec{" "}
            <strong>{FREE_TIER_CUSTOMER_LIMIT} cartes clients</strong>. L&apos;abonnement lève la
            limite et ouvre {TRIAL_DAYS} jours d&apos;essai.
          </p>
          <p>
            En cas d&apos;interruption, vous gardez {SUBSCRIPTION_GRACE_DAYS} jours pour enregistrer
            vos visites avant suspension. Vos clients et leurs points sont toujours conservés.
          </p>
        </Section>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Questions fréquentes</h2>
        <Card className="p-0 px-5">
          <Question question="Un client a perdu le lien de sa carte, que faire ?">
            Retrouvez-le dans Clients en cherchant son prénom ou son téléphone : vous pouvez
            enregistrer sa visite sans sa carte. Il peut aussi se faire renvoyer son lien par email
            depuis votre page d&apos;inscription, rubrique « Vous avez déjà une carte ».
          </Question>

          <Question question="J'ai scanné deux fois le même client par erreur">
            Les deux scans rapprochés ne comptent qu&apos;une fois : une visite enregistrée il y a
            moins de dix secondes n&apos;est jamais dupliquée.
          </Question>

          <Question question="La caméra ne s'ouvre pas sur mon téléphone">
            Autorisez l&apos;accès à la caméra dans votre navigateur. En attendant, utilisez la
            recherche par téléphone ou prénom, en bas de l&apos;écran Scanner : elle enregistre la
            visite de la même façon.
          </Question>

          <Question question="Mes clients doivent-ils installer une application ?">
            Non. Leur carte est une simple page web. Ils peuvent l&apos;ajouter à l&apos;écran
            d&apos;accueil de leur téléphone pour la retrouver en un geste, mais rien n&apos;est
            obligatoire.
          </Question>

          <Question question="Puis-je changer mon programme en cours de route ?">
            Oui, à tout moment. Les points déjà acquis par vos clients sont conservés. Prévenez-les
            si vous modifiez le seuil, pour éviter les incompréhensions au comptoir.
          </Question>

          <Question question="Que deviennent les données de mes clients ?">
            Elles vous appartiennent. Vous pouvez supprimer définitivement un client depuis sa
            fiche, ce qui efface aussi ses visites, ses récompenses et son historique d&apos;emails.
          </Question>
        </Card>
      </section>

      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">Une question qui n&apos;est pas ici ?</p>
          <p className="text-sm text-muted-foreground">Écrivez-nous, on répond vite.</p>
        </div>
        {LEGAL_ENTITY.email ? (
          <Button asChild variant="outline">
            <a href={`mailto:${LEGAL_ENTITY.email}`}>Nous écrire</a>
          </Button>
        ) : null}
      </Card>
    </div>
  );
}

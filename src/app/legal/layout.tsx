import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Wordmark } from "@/components/brand";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <div className="flex items-center justify-between gap-4">
        <Wordmark />
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Retour
        </Link>
      </div>
      {/* Mesure de lecture volontairement courte : un texte juridique se lit
          mal au-delà d'une soixantaine de caractères par ligne. */}
      <article className="mt-10 space-y-4 [&_h2]:mt-10 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-[-0.015em] [&_li]:ml-5 [&_li]:list-disc [&_li]:leading-relaxed [&_li]:text-muted-foreground [&_p]:max-w-[62ch] [&_p]:leading-relaxed [&_p]:text-muted-foreground">
        {children}
      </article>
    </div>
  );
}

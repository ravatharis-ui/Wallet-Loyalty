import Link from "next/link";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <Link href="/" className="text-sm text-muted-foreground underline">
        ← Retour
      </Link>
      <article className="mt-6 space-y-4 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:leading-relaxed [&_p]:text-muted-foreground">
        {children}
      </article>
    </div>
  );
}

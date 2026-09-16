"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Partage du lien de parrainage depuis la carte du client.
 *
 * Le lien porte le code de parrainage, jamais le card_token : partager sa carte
 * reviendrait à donner ses points.
 */
export function ReferralShare({
  url,
  businessName,
  points,
}: {
  url: string;
  businessName: string;
  points: number;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const text = `Je suis client chez ${businessName}, rejoins leur programme de fidélité avec mon lien : on gagne ${points} points chacun.`;

    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: businessName, text, url });
        return;
      } catch {
        // Partage annulé : on retombe sur la copie du lien.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Presse-papiers refusé : le lien reste lisible et sélectionnable à l'écran.
    }
  }

  return (
    <div className="mt-3">
      <Button variant="outline" className="w-full" onClick={share}>
        {copied ? (
          <>
            <Check className="mr-2 h-4 w-4" aria-hidden />
            Lien copié
          </>
        ) : (
          <>
            <Share2 className="mr-2 h-4 w-4" aria-hidden />
            Partager mon lien
          </>
        )}
      </Button>
      <p className="mt-2 break-all text-center text-xs text-muted-foreground">{url}</p>
    </div>
  );
}

import { NextResponse } from "next/server";
import { getCardByToken } from "@/lib/public-data";
import { safeCardColor } from "@/lib/colors";

export const dynamic = "force-dynamic";

/**
 * Manifeste propre à une carte.
 *
 * Le manifeste global déclare `start_url: "/"` : un raccourci créé depuis la
 * carte rouvrait donc l'accueil de Fidelia, pas la carte du client. Chaque
 * carte sert ici le sien, avec son point de départ, le nom du commerce et sa
 * couleur — le client retrouve sa boutique sur son écran d'accueil, pas nous.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getCardByToken(token);

  if (!data) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const { business } = data;

  return NextResponse.json(
    {
      name: `Ma carte — ${business.name}`,
      short_name: business.name.slice(0, 12),
      description: `Votre carte de fidélité ${business.name}`,
      start_url: `/card/${token}`,
      scope: `/card/${token}`,
      display: "standalone",
      background_color: "#fbfaf7",
      theme_color: safeCardColor(business.card_color),
      icons: [
        { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
        { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
      ],
    },
    {
      headers: {
        "Content-Type": "application/manifest+json",
        // Le nom ou la couleur du commerce peuvent changer : on ne fige pas.
        "Cache-Control": "no-store",
      },
    },
  );
}

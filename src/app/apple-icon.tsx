import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * Icône affichée quand un client ajoute sa carte à l'écran d'accueil iOS.
 * iOS n'accepte pas le SVG : Next génère ce PNG au build.
 */
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#ffffff",
      }}
    >
      <svg width="180" height="180" viewBox="0 0 64 64">
        <path d="M21 13h24v9H30v8h13v9H30v12h-9z" fill="#000000" />
      </svg>
    </div>,
    size,
  );
}

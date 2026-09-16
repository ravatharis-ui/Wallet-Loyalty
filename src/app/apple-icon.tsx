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
        background: "#111827",
      }}
    >
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: "50%",
          border: "12px solid #ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#4f46e5" }} />
      </div>
    </div>,
    size,
  );
}

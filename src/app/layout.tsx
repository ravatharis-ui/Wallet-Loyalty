import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Fidelia — Carte de fidélité digitale pour les commerces",
    template: "%s · Fidelia",
  },
  description:
    "Carte de fidélité digitale et relances automatiques pour les petits commerces. Vos clients scannent un QR code, vous les faites revenir.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#111827",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}

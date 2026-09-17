import type { Metadata, Viewport } from "next";
import { fontDisplay, fontSans } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Fidelia — Carte de fidélité digitale pour les commerces",
    template: "%s · Fidelia",
  },
  description:
    "Carte de fidélité digitale et relances automatiques pour les petits commerces. Vos clients scannent un QR code, vous les faites revenir.",
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Fidelia",
    title: "Fidelia — Carte de fidélité digitale pour les commerces",
    description:
      "La carte de fidélité de votre commerce, sur le téléphone de vos clients. Vous scannez, Fidelia compte les visites et relance ceux qui s'éloignent.",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1a1815",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${fontSans.variable} ${fontDisplay.variable}`}>
      <body>{children}</body>
    </html>
  );
}

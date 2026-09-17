import { Instrument_Serif, Manrope } from "next/font/google";

/** Titres éditoriaux : un serif à fort caractère, réservé aux grandes tailles. */
export const fontDisplay = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

/** Texte d'interface : variable, chiffres tabulaires activés dans globals.css. */
export const fontSans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans-loaded",
  display: "swap",
});

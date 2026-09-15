"use client";

import { useRef } from "react";
import { Scanner, type IDetectedBarcode } from "@yudiel/react-qr-scanner";

/**
 * Lecture de QR code via la caméra.
 * Un même code n'est remonté qu'une fois par session de scan.
 */
export function QrReader({
  onToken,
  onError,
}: {
  onToken: (token: string) => void;
  onError: (message: string) => void;
}) {
  const handled = useRef(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      <Scanner
        formats={["qr_code"]}
        scanDelay={300}
        onScan={(codes: IDetectedBarcode[]) => {
          const value = codes[0]?.rawValue;
          if (!value || handled.current) return;
          handled.current = true;
          onToken(value);
        }}
        onError={() =>
          onError(
            "Impossible d'accéder à la caméra. Autorisez l'accès ou utilisez la recherche par téléphone.",
          )
        }
        components={{ finder: true, torch: true }}
        styles={{ container: { width: "100%" } }}
      />
    </div>
  );
}

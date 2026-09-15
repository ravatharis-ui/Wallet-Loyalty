"use client";

import { Button } from "@/components/ui/button";

/** Téléchargement et impression de l'affichette QR. */
export function JoinQrActions({
  joinUrl,
  businessName,
}: {
  joinUrl: string;
  businessName: string;
}) {
  function download() {
    const image = document.querySelector<HTMLImageElement>('img[alt^="QR code d\'inscription"]');
    if (!image) return;
    const link = document.createElement("a");
    link.href = image.src;
    link.download = `qr-fidelite-${businessName.toLowerCase().replace(/\s+/g, "-")}.png`;
    link.click();
  }

  function print() {
    const image = document.querySelector<HTMLImageElement>('img[alt^="QR code d\'inscription"]');
    if (!image) return;
    const win = window.open("", "_blank", "width=800,height=1000");
    if (!win) return;
    win.document.write(
      `<html><head><title>QR fidélité</title></head>
       <body style="font-family:system-ui;text-align:center;padding:60px;">
         <h1 style="font-size:32px;">${businessName}</h1>
         <p style="font-size:22px;">Scannez pour rejoindre notre programme fidélité</p>
         <img src="${image.src}" style="width:420px;height:420px;" />
         <p style="font-size:13px;color:#666;">${joinUrl}</p>
       </body></html>`,
    );
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <div className="flex flex-wrap justify-center gap-2">
      <Button variant="outline" onClick={download}>
        Télécharger le QR
      </Button>
      <Button variant="outline" onClick={print}>
        Imprimer l&apos;affichette
      </Button>
    </div>
  );
}

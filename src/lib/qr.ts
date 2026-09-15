import "server-only";
import QRCode from "qrcode";

/** QR code encodé en data URL PNG, prêt à mettre dans un <img>. */
export async function qrDataUrl(text: string, size = 512): Promise<string> {
  return QRCode.toDataURL(text, {
    width: size,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#111827", light: "#ffffff" },
  });
}

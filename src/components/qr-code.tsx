import { qrDataUrl } from "@/lib/qr";

/** QR code rendu côté serveur (image PNG en data URL). */
export async function QrCode({
  value,
  size = 256,
  alt,
  className,
}: {
  value: string;
  size?: number;
  alt: string;
  className?: string;
}) {
  const src = await qrDataUrl(value, 512);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- data URL, pas d'optimisation possible
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size }}
    />
  );
}

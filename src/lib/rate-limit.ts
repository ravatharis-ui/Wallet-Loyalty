import "server-only";

/**
 * Limitation de débit en mémoire (par instance).
 * Suffisant au MVP pour freiner les abus simples sur les routes publiques.
 * À remplacer par un store partagé si le trafic le justifie.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;

  bucket.count += 1;
  return true;
}

/** Nettoyage opportuniste pour éviter une croissance illimitée de la Map. */
export function pruneRateLimits() {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}

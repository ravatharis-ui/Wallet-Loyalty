import { NextResponse, type NextRequest } from "next/server";
import { runInactivityReminders } from "@/lib/reminders";
import { runScheduledCampaigns } from "@/lib/campaigns";
import { requireEnv } from "@/lib/env";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Tâche quotidienne : relances d'inactivité, puis campagnes programmées.
 *
 * Les deux partagent le même passage pour ne pas multiplier les tâches
 * planifiées — le forfait Vercel en limite le nombre et la fréquence.
 *
 * Protégée par un secret partagé : sans `Authorization: Bearer $CRON_SECRET`
 * (l'en-tête envoyé par Vercel Cron), la route répond 401.
 */
export async function GET(request: NextRequest) {
  const secret = requireEnv("CRON_SECRET");
  const header = request.headers.get("authorization");

  if (header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const reminders = await runInactivityReminders();
  // Les campagnes passent après : une relance ratée ne doit pas empêcher une
  // campagne programmée de partir, et inversement.
  const campaigns = await runScheduledCampaigns();

  return NextResponse.json({ ok: true, reminders, campaigns });
}

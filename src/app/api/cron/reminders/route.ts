import { NextResponse, type NextRequest } from "next/server";
import { runInactivityReminders } from "@/lib/reminders";
import { requireEnv } from "@/lib/env";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Relances automatiques quotidiennes.
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

  const summary = await runInactivityReminders();
  return NextResponse.json({ ok: true, ...summary });
}

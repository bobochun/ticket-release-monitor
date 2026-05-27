import { NextResponse } from "next/server";
import { countRecentRuns } from "@/src/server/runs";
import { countTargets } from "@/src/server/targets";
import { getConfiguredStatus } from "@/src/server/settings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const [targetCounts, recentRuns] = await Promise.all([countTargets(), countRecentRuns()]);
  const settings = getConfiguredStatus();

  return NextResponse.json({
    ok: true,
    activeTargets: targetCounts.activeTargets,
    recentRuns,
    telegramConfigured: settings.telegramConfigured,
    discordConfigured: settings.discordConfigured,
    cronSecretConfigured: settings.cronSecretConfigured,
    checkMode: settings.checkMode,
    ocrEnabled: settings.ocrEnabled,
    ocrMode: settings.ocrMode,
    timestamp: new Date().toISOString()
  });
}

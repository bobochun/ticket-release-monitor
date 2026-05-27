import type { SchedulerSummary } from "@/src/shared/types";
import { checkTarget } from "./checker";
import { notifyCheckResult } from "./notifications";
import { saveCheckRun } from "./runs";
import { listDueTargets, markTargetChecked } from "./targets";
import { getEnvNumber } from "./settings";

export async function runDueTargetChecks(): Promise<SchedulerSummary> {
  const maxTargetsPerCron = getEnvNumber("MAX_TARGETS_PER_CRON", 2);
  const targets = await listDueTargets(maxTargetsPerCron);
  const results = [];

  for (const target of targets) {
    const result = await checkTarget(target);
    await saveCheckRun(result);
    await markTargetChecked(target.id, target.checkIntervalSeconds);
    await notifyCheckResult(result);
    results.push(result);
  }

  return {
    ok: true,
    checked: results.length,
    dueTargets: targets.length,
    maxTargetsPerCron,
    results,
    timestamp: new Date().toISOString()
  };
}

export function isAuthorizedCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const url = new URL(request.url);
  const auth = request.headers.get("authorization") || "";
  const cronHeader = request.headers.get("x-vercel-cron");

  if (cronHeader === "1") return true;
  if (!secret) return false;
  return auth === `Bearer ${secret}` || url.searchParams.get("secret") === secret;
}

import type { SchedulerSummary } from "@/src/shared/types";
import { checkTarget } from "./checker";
import { notifyCheckResult } from "./notifications";
import { saveCheckRun } from "./runs";
import { listDueTargets, markTargetChecked } from "./targets";
import { getEnvNumber } from "./settings";

export type CronTrigger = "vercel-cron" | "external-scheduler" | "manual";

export type CronAuthorization =
  | { authorized: true; trigger: CronTrigger }
  | { authorized: false; trigger: null };

function isPlaceholderUrl(url: string): boolean {
  const normalized = url.toLowerCase();
  return (
    normalized.includes("your_event_url") ||
    normalized.includes("your_event_id") ||
    normalized.includes("example.com")
  );
}

export async function runDueTargetChecks(trigger?: CronTrigger): Promise<SchedulerSummary> {
  const maxTargetsPerCron = getEnvNumber("MAX_TARGETS_PER_CRON", 2);
  const targets = await listDueTargets(maxTargetsPerCron * 5);
  const results = [];
  const skippedTargets: SchedulerSummary["skippedTargets"] = [];

  for (const target of targets) {
    if (results.length >= maxTargetsPerCron) break;

    if (target.isTemplate) {
      skippedTargets.push({
        id: target.id,
        name: target.name,
        url: target.url,
        reason: "Template targets are never checked by cron."
      });
      await markTargetChecked(target.id, target.checkIntervalSeconds);
      continue;
    }

    if (isPlaceholderUrl(target.url)) {
      skippedTargets.push({
        id: target.id,
        name: target.name,
        url: target.url,
        reason: "Placeholder URL skipped. Replace it with a real official ticket page before enabling."
      });
      await markTargetChecked(target.id, target.checkIntervalSeconds);
      continue;
    }

    const result = await checkTarget(target);
    await saveCheckRun(result);
    await markTargetChecked(target.id, target.checkIntervalSeconds);
    await notifyCheckResult(result);
    results.push(result);
  }

  return {
    ok: true,
    trigger,
    checked: results.length,
    skipped: skippedTargets.length,
    dueTargets: targets.length,
    maxTargetsPerCron,
    results,
    skippedTargets,
    timestamp: new Date().toISOString()
  };
}

export function authorizeCronRequest(request: Request): CronAuthorization {
  const secret = process.env.CRON_SECRET;
  const url = new URL(request.url);
  const auth = request.headers.get("authorization") || "";
  const userAgent = request.headers.get("user-agent") || "";
  const cronHeader = request.headers.get("x-vercel-cron");
  const isVercelCron = cronHeader === "1" || userAgent.toLowerCase().includes("vercel-cron/1.0");

  if (isVercelCron) return { authorized: true, trigger: "vercel-cron" };
  if (!secret) return { authorized: false, trigger: null };
  if (auth === `Bearer ${secret}`) return { authorized: true, trigger: "external-scheduler" };
  if (url.searchParams.get("secret") === secret) return { authorized: true, trigger: "manual" };
  return { authorized: false, trigger: null };
}

export function isAuthorizedCronRequest(request: Request): boolean {
  return authorizeCronRequest(request).authorized;
}

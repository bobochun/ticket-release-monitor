import { NextResponse } from "next/server";
import { AppError, errorResponse } from "@/src/server/apiErrors";
import { checkTarget } from "@/src/server/checker";
import { notifyCheckResult } from "@/src/server/notifications";
import { saveCheckRun } from "@/src/server/runs";
import { getTarget, markTargetChecked } from "@/src/server/targets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const target = await getTarget(Number(id));
  if (!target) {
    return errorResponse(new AppError("TARGET_NOT_FOUND", "找不到監控目標。", 404), 404);
  }

  const result = await checkTarget(target);
  const notifications = await notifyCheckResult(result, target.platform);
  const run = await saveCheckRun(result);
  await markTargetChecked(target.id, target.checkIntervalSeconds);

  return NextResponse.json({ ok: true, result, run, notifications });
}

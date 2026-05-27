import { NextResponse } from "next/server";
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
  if (!target) return NextResponse.json({ error: "Target not found" }, { status: 404 });

  const result = await checkTarget(target);
  const run = await saveCheckRun(result);
  await markTargetChecked(target.id, target.checkIntervalSeconds);
  await notifyCheckResult(result);

  return NextResponse.json({ result, run });
}

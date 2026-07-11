import { NextResponse } from "next/server";
import { authorizeCronRequest, runDueTargetChecks } from "@/src/server/scheduler";
import { publicErrorInfo } from "@/src/server/publicErrors";
import { getSchedulerGateStatus } from "@/src/server/settings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const authorization = authorizeCronRequest(request);
  if (!authorization.authorized) {
    return NextResponse.json({ ok: false, error: "未授權的排程請求。", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const gate = getSchedulerGateStatus(authorization.trigger);
  if (!gate.allowed) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      message: "本次排程由省資源閘門略過，未連線資料庫。",
      trigger: authorization.trigger,
      gate,
      timestamp: new Date().toISOString()
    });
  }

  try {
    const result = await runDueTargetChecks(authorization.trigger);
    return NextResponse.json({ ...result, gate });
  } catch (error) {
    console.error("Cron check failed", error);
    const publicError = publicErrorInfo(error);
    return NextResponse.json(
      {
        ok: false,
        code: publicError.code,
        error: publicError.message,
        trigger: authorization.trigger,
        gate,
        timestamp: new Date().toISOString()
      },
      { status: publicError.status }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}

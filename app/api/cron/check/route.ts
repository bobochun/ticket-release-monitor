import { NextResponse } from "next/server";
import { authorizeCronRequest, runDueTargetChecks } from "@/src/server/scheduler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const authorization = authorizeCronRequest(request);
  if (!authorization.authorized) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await runDueTargetChecks(authorization.trigger));
}

export async function POST(request: Request) {
  return GET(request);
}

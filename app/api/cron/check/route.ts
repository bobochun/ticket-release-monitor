import { NextResponse } from "next/server";
import { isAuthorizedCronRequest, runDueTargetChecks } from "@/src/server/scheduler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await runDueTargetChecks());
}

export async function POST(request: Request) {
  return GET(request);
}

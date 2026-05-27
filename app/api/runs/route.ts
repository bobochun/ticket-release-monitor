import { NextRequest, NextResponse } from "next/server";
import { listRuns } from "@/src/server/runs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const limit = Number(request.nextUrl.searchParams.get("limit") || 50);
  return NextResponse.json({ runs: await listRuns(Math.min(Math.max(limit, 1), 100)) });
}

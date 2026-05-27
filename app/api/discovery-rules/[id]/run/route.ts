import { NextResponse } from "next/server";
import { errorResponse } from "@/src/server/apiErrors";
import { runDiscoveryRule } from "@/src/server/discovery";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const candidates = await runDiscoveryRule(Number(id));
    return NextResponse.json({ ok: true, candidates });
  } catch (error) {
    return errorResponse(error, 400);
  }
}

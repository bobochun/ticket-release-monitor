import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/src/server/apiErrors";
import { createDiscoveryRule, listDiscoveredCandidates, listDiscoveryRules } from "@/src/server/discovery";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const [rules, candidates] = await Promise.all([listDiscoveryRules(), listDiscoveredCandidates()]);
  return NextResponse.json({ rules, candidates });
}

export async function POST(request: NextRequest) {
  try {
    const rule = await createDiscoveryRule(await request.json());
    return NextResponse.json({ ok: true, rule }, { status: 201 });
  } catch (error) {
    return errorResponse(error, 400);
  }
}

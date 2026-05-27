import { NextRequest, NextResponse } from "next/server";
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
    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}

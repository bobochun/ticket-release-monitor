import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/src/server/apiErrors";
import { createTarget, listTargets } from "@/src/server/targets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ targets: await listTargets() });
}

export async function POST(request: NextRequest) {
  try {
    const target = await createTarget(await request.json());
    return NextResponse.json({ ok: true, target }, { status: 201 });
  } catch (error) {
    return errorResponse(error, 400);
  }
}

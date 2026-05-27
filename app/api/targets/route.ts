import { NextRequest, NextResponse } from "next/server";
import { createTarget, listTargets } from "@/src/server/targets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ targets: await listTargets() });
}

export async function POST(request: NextRequest) {
  try {
    const target = await createTarget(await request.json());
    return NextResponse.json({ target }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}

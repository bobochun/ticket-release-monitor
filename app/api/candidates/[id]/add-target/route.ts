import { NextResponse } from "next/server";
import { errorResponse } from "@/src/server/apiErrors";
import { addCandidateAsTarget } from "@/src/server/discovery";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const target = await addCandidateAsTarget(Number(id));
    return NextResponse.json({ ok: true, target });
  } catch (error) {
    return errorResponse(error, 400);
  }
}

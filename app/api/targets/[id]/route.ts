import { NextRequest, NextResponse } from "next/server";
import { deleteTarget, getTarget, updateTarget } from "@/src/server/targets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const target = await getTarget(Number(id));
  return target
    ? NextResponse.json({ target })
    : NextResponse.json({ error: "Target not found" }, { status: 404 });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  try {
    const target = await updateTarget(Number(id), await request.json());
    return target
      ? NextResponse.json({ target })
      : NextResponse.json({ error: "Target not found" }, { status: 404 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  await deleteTarget(Number(id));
  return NextResponse.json({ ok: true });
}

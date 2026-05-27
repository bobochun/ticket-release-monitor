import { NextRequest, NextResponse } from "next/server";
import { AppError, errorResponse } from "@/src/server/apiErrors";
import { deleteTarget, getTarget, updateTarget } from "@/src/server/targets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const target = await getTarget(Number(id));
  return target
    ? NextResponse.json({ ok: true, target })
    : errorResponse(new AppError("TARGET_NOT_FOUND", "找不到監控目標。", 404), 404);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  try {
    const target = await updateTarget(Number(id), await request.json());
    return target
      ? NextResponse.json({ ok: true, target })
      : errorResponse(new AppError("TARGET_NOT_FOUND", "找不到監控目標。", 404), 404);
  } catch (error) {
    return errorResponse(error, 400);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  await deleteTarget(Number(id));
  return NextResponse.json({ ok: true });
}

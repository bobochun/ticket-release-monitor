import { NextResponse } from "next/server";
import { getConfiguredStatus } from "@/src/server/settings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getConfiguredStatus());
}

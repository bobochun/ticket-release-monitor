import { NextResponse } from "next/server";
import { sendTestNotification } from "@/src/server/notifications";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  await sendTestNotification();
  return NextResponse.json({ ok: true });
}

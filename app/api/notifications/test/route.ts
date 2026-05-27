import { NextResponse } from "next/server";
import { errorResponse } from "@/src/server/apiErrors";
import { sendTestNotification, type NotificationChannel } from "@/src/server/notifications";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const channel = (body.channel || "all") as NotificationChannel;
    const valid = ["telegram", "discord", "all"].includes(channel);
    if (!valid) {
      return NextResponse.json(
        { ok: false, error: "不支援的通知渠道。", code: "INVALID_INPUT" },
        { status: 400 }
      );
    }
    const results = await sendTestNotification(channel);
    return NextResponse.json({ ok: true, results });
  } catch (error) {
    return errorResponse(error, 500);
  }
}

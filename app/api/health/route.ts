import { NextResponse } from "next/server";
import { checkDbConnection, getDatabaseRuntimeStatus } from "@/src/server/db";
import { publicErrorInfo } from "@/src/server/publicErrors";
import { isAuthorizedCronRequest } from "@/src/server/scheduler";
import { getConfiguredStatus, getSchedulerGateStatus } from "@/src/server/settings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const deep = url.searchParams.get("deep") === "1";
  const database = getDatabaseRuntimeStatus();
  const scheduler = getSchedulerGateStatus("external-scheduler");
  const settings = getConfiguredStatus();

  if (!deep) {
    return NextResponse.json(
      {
        ok: database.configured,
        service: "ticket-radar",
        check: "shallow",
        database,
        scheduler,
        notifications: {
          telegramConfigured: settings.telegramConfigured,
          discordConfigured: settings.discordConfigured
        },
        checkMode: settings.checkMode,
        ocrEnabled: settings.ocrEnabled,
        timestamp: new Date().toISOString()
      },
      { status: database.configured ? 200 : 503 }
    );
  }

  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json(
      { ok: false, code: "UNAUTHORIZED", error: "深度健康檢查需要 Cron Secret。" },
      { status: 401 }
    );
  }

  try {
    await checkDbConnection();
    return NextResponse.json({
      ok: true,
      service: "ticket-radar",
      check: "deep",
      database: { ...database, reachable: true },
      scheduler,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Deep health check failed", error);
    const publicError = publicErrorInfo(error);
    return NextResponse.json(
      {
        ok: false,
        service: "ticket-radar",
        check: "deep",
        code: publicError.code,
        error: publicError.message,
        database: { ...database, reachable: false },
        scheduler,
        timestamp: new Date().toISOString()
      },
      { status: publicError.status }
    );
  }
}

import * as cheerio from "cheerio";
import { NextResponse } from "next/server";
import { z } from "zod";
import { detectAccessBarrier, detectAvailability } from "@/src/server/detector";
import { notifyCheckResult } from "@/src/server/notifications";
import { hasMeaningfulTicketContent } from "@/src/server/parsers/genericAvailabilityParser";
import { saveCheckRun } from "@/src/server/runs";
import { getTarget } from "@/src/server/targets";
import { getPlatformDefault } from "@/src/shared/platformDefaults";
import type { Target } from "@/src/shared/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const manualParseSchema = z.object({
  platform: z.string().default("generic"),
  url: z.string().url(),
  contentType: z.enum(["text", "html"]).default("text"),
  content: z.string().min(5),
  targetId: z.number().int().positive().optional(),
  saveRun: z.boolean().default(true),
  sendNotification: z.boolean().default(false)
});

export async function POST(request: Request) {
  try {
    const input = manualParseSchema.parse(await request.json());
    return await handleManualParse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, code: "INVALID_INPUT", error: "Manual Parse 輸入格式不正確。" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        ok: false,
        code: "MANUAL_PARSE_FAILED",
        error: error instanceof Error ? error.message : "Manual Parse 失敗。"
      },
      { status: 500 }
    );
  }
}

async function handleManualParse(input: z.infer<typeof manualParseSchema>) {
  const existingTarget = input.targetId ? await getTarget(input.targetId) : null;
  const platform = existingTarget?.platform || input.platform;
  const defaults = getPlatformDefault(platform);
  const html = input.contentType === "html" ? input.content : "";
  const text = input.contentType === "html" ? extractTextFromHtml(input.content) : input.content;
  const barrier = detectAccessBarrier({ text, html, url: input.url });

  if (barrier.barrierType !== "none" && !hasMeaningfulTicketContent({ text, html })) {
    return NextResponse.json(
      {
        ok: false,
        code: "CAPTCHA_OR_BARRIER_CONTENT",
        error: "內容包含驗證、排隊或登入阻擋。本工具不解析驗證碼，請只貼上公開票區內容。"
      },
      { status: 400 }
    );
  }

  const target: Target =
    existingTarget ??
    {
      id: 0,
      name: "Manual Parse",
      platform,
      url: input.url,
      enabled: true,
      checkIntervalSeconds: 300,
      timeoutMs: 30000,
      includeKeywords: defaults.includeKeywords,
      excludeKeywords: defaults.excludeKeywords,
      eventKeywords: [],
      dateKeywords: [],
      venueKeywords: [],
      areaKeywords: defaults.areaKeywords,
      areaBlacklist: defaults.areaBlacklist,
      priceKeywords: defaults.priceKeywords,
      matchMode: "strict",
      notifyOn: "available_only",
      notes: null,
      isTemplate: false,
      lastCheckedAt: null,
      nextCheckAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

  const result = {
    ...detectAvailability({
      target,
      text,
      html,
      source: "manual_parse"
    }),
    targetId: existingTarget?.id ?? null,
    targetName: existingTarget?.name ?? "Manual Parse"
  };
  const notifications = input.sendNotification ? await notifyCheckResult(result, platform) : [];
  const run = input.saveRun ? await saveCheckRun(result) : null;

  return NextResponse.json({ ok: true, result, run, notifications });
}

function extractTextFromHtml(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg").remove();
  return $("body").text() || $.root().text();
}

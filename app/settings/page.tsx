"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCircle2, Database, Gauge, ShieldCheck } from "lucide-react";

type SettingsState = {
  telegramConfigured: boolean;
  discordConfigured: boolean;
  cronSecretConfigured: boolean;
  cronSecretMasked: string;
  databaseConfigured: boolean;
  databaseVariable: string;
  autoDbMigrate: boolean;
  dbMaxConnections: number;
  checkMode: string;
  maxTargetsPerCron: number;
  maxConcurrentChecks: number;
  minCheckIntervalSeconds: number;
  defaultCheckIntervalSeconds: number;
  notificationDedupeMinutes: number;
  errorDedupeMinutes: number;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  quietHoursTimezone: string;
  schedulerEnabled: boolean;
  schedulerProfile: "eco" | "balanced" | "burst" | "custom";
  schedulerAllowedMinutes: number[] | null;
  schedulerAllowedNow: boolean;
  schedulerGateReason: string;
  schedulerSkipQuietHours: boolean;
  externalSchedulerIntervalMinutes: number;
  manualCheckBypassSchedulerGate: boolean;
  allowCronSecretQuery: boolean;
  ocrEnabled: boolean;
  ocrMode: string;
  ocrLang: string;
  ocrMaxImagesPerCheck: number;
  ocrMaxImageBytes: number;
  ocrTimeoutMs: number;
  ocrAllowCrossOrigin: boolean;
  cronEndpointHint: string;
  cronAuthorizationHint: string;
};

type TestResult = {
  channel: string;
  status: string;
  error?: string;
};

function profileLabel(profile: SettingsState["schedulerProfile"] | undefined): string {
  if (profile === "eco") return "省電：每小時一次";
  if (profile === "balanced") return "平衡：每 30 分鐘一次";
  if (profile === "burst") return "密集：依外部排程頻率";
  if (profile === "custom") return "自訂分鐘桶";
  return "讀取中";
}

function formatSeconds(value: number | undefined): string {
  if (!value) return "-";
  if (value % 3600 === 0) return `${value / 3600} 小時`;
  if (value % 60 === 0) return `${value / 60} 分鐘`;
  return `${value} 秒`;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then((response) => response.json())
      .then(setSettings)
      .catch(() => setSettings(null));
  }, []);

  const endpoint = useMemo(() => {
    if (typeof window === "undefined") return "/api/cron/check";
    return `${window.location.origin}${settings?.cronEndpointHint || "/api/cron/check"}`;
  }, [settings?.cronEndpointHint]);

  async function testNotification(channel: "telegram" | "discord" | "all") {
    setBusy(channel);
    setMessage(null);
    const response = await fetch("/api/notifications/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ channel })
    });
    const body = await response.json().catch(() => ({}));
    const summary = (body.results || [])
      .map((result: TestResult) => `${result.channel}: ${result.status}${result.error ? ` (${result.error})` : ""}`)
      .join("，");
    setMessage(response.ok ? `測試完成：${summary}` : body.error || "測試通知失敗。");
    setBusy(null);
  }

  return (
    <main className="page-shell">
      <section className="mb-5">
        <p className="text-sm font-black uppercase tracking-normal text-teal-700">系統設定</p>
        <h1 className="mt-1 text-3xl font-black tracking-normal">系統設定</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
          Secret 只從 Vercel 環境變數讀取；畫面不會顯示完整 token、webhook 或資料庫連線字串。
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Telegram", settings?.telegramConfigured],
          ["Discord", settings?.discordConfigured],
          ["Cron Secret", settings?.cronSecretConfigured],
          ["PostgreSQL", settings?.databaseConfigured]
        ].map(([label, value]) => (
          <div className="surface p-4" key={String(label)}>
            <div className="flex items-center gap-2 text-teal-700">
              <CheckCircle2 size={20} />
              <h2 className="font-black">{label}</h2>
            </div>
            <p className="mt-2 text-2xl font-black">{value ? "已設定" : "未設定"}</p>
          </div>
        ))}
      </section>

      <section className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="surface p-4">
          <div className="flex items-center gap-2 text-teal-700">
            <Database size={20} />
            <h2 className="text-lg font-black">資料庫執行模式</h2>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="font-bold text-slate-500">連線變數</dt>
              <dd className="font-black">{settings?.databaseVariable ?? "-"}</dd>
            </div>
            <div>
              <dt className="font-bold text-slate-500">最大連線數</dt>
              <dd className="font-black">{settings?.dbMaxConnections ?? 1}</dd>
            </div>
            <div>
              <dt className="font-bold text-slate-500">自動 migration</dt>
              <dd className="font-black">{settings?.autoDbMigrate ? "啟用" : "關閉"}</dd>
            </div>
            <div>
              <dt className="font-bold text-slate-500">健康檢查</dt>
              <dd className="font-black"><a className="text-teal-700" href="/api/health" target="_blank" rel="noreferrer">開啟</a></dd>
            </div>
          </dl>
          <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
            Production 預設不在每個 serverless cold start 重跑 DDL/migration。新資料庫請先執行一次 <code>npm run db:init</code>。
          </p>
        </div>

        <div className="surface p-4">
          <div className="flex items-center gap-2 text-amber-700">
            <Gauge size={20} />
            <h2 className="text-lg font-black">省資源排程</h2>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="font-bold text-slate-500">排程狀態</dt>
              <dd className="font-black">{settings?.schedulerEnabled ? "啟用" : "停用"}</dd>
            </div>
            <div>
              <dt className="font-bold text-slate-500">Profile</dt>
              <dd className="font-black">{profileLabel(settings?.schedulerProfile)}</dd>
            </div>
            <div>
              <dt className="font-bold text-slate-500">目前閘門</dt>
              <dd className="font-black">{settings?.schedulerAllowedNow ? "允許連 DB" : "略過，不連 DB"}</dd>
            </div>
            <div>
              <dt className="font-bold text-slate-500">閘門原因</dt>
              <dd className="font-black">{settings?.schedulerGateReason ?? "-"}</dd>
            </div>
            <div>
              <dt className="font-bold text-slate-500">允許分鐘</dt>
              <dd className="font-black">{settings?.schedulerAllowedMinutes?.join("、") ?? "全部"}</dd>
            </div>
            <div>
              <dt className="font-bold text-slate-500">外部排程建議</dt>
              <dd className="font-black">每 {settings?.externalSchedulerIntervalMinutes ?? 30} 分鐘</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="surface mt-4 p-4">
        <h2 className="text-lg font-black">外部 Scheduler 設定</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
          目前建議使用平衡模式，每 30 分鐘呼叫一次。只有活動接近釋票高峰時，才短暫切到 burst 並縮短頻率。
        </p>
        <div className="mt-3 rounded-md bg-slate-100 p-3 text-sm font-bold text-slate-800">{endpoint}</div>
        <div className="mt-2 rounded-md bg-slate-100 p-3 text-sm font-bold text-slate-800">
          Authorization: Bearer {settings?.cronSecretMasked || "****"}
        </div>
        <p className="mt-2 text-xs font-semibold text-slate-500">
          優先使用 Authorization header，避免 secret 出現在網址、瀏覽器紀錄與第三方 logs。Query secret 僅保留相容性：
          {settings?.allowCronSecretQuery ? "目前允許" : "目前停用"}。
        </p>
        <ol className="mt-3 grid gap-2 text-sm font-semibold text-slate-700">
          <li>1. 平常：balanced，外部 Scheduler 每 30 分鐘。</li>
          <li>2. 最省：eco，每 60 分鐘。</li>
          <li>3. 活動高峰：burst，才使用 5–10 分鐘；結束後立刻切回 balanced。</li>
          <li>4. 即使外部服務誤設成每 5 分鐘，minute bucket 也會在多數呼叫時直接略過，不喚醒資料庫。</li>
        </ol>
      </section>

      <section className="surface mt-4 p-4">
        <div className="flex items-center gap-2 text-teal-700">
          <Bell size={20} />
          <h2 className="text-lg font-black">通知測試</h2>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <button className="btn btn-secondary" onClick={() => testNotification("telegram")} disabled={busy !== null}>
            測試 Telegram
          </button>
          <button className="btn btn-secondary" onClick={() => testNotification("discord")} disabled={busy !== null}>
            測試 Discord
          </button>
          <button className="btn btn-primary" onClick={() => testNotification("all")} disabled={busy !== null}>
            測試全部
          </button>
        </div>
        {message ? <p className="mt-2 text-sm font-bold text-slate-700">{message}</p> : null}
      </section>

      <section className="surface mt-4 p-4">
        <h2 className="text-lg font-black">公開票況圖片 OCR</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
          OCR 只用來輔助辨識公開售票頁上的餘票圖片文字。系統會先偵測 CAPTCHA、Cloudflare、排隊與登入頁；命中就停止。
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div><dt className="font-bold text-slate-500">OCR 狀態</dt><dd className="font-black">{settings?.ocrEnabled ? "已啟用" : "未啟用"}</dd></div>
          <div><dt className="font-bold text-slate-500">OCR 模式</dt><dd className="font-black">{settings?.ocrMode ?? "tesseract"}</dd></div>
          <div><dt className="font-bold text-slate-500">語言</dt><dd className="font-black">{settings?.ocrLang ?? "eng+chi_tra"}</dd></div>
          <div><dt className="font-bold text-slate-500">每次最多圖片</dt><dd className="font-black">{settings?.ocrMaxImagesPerCheck ?? 1}</dd></div>
          <div><dt className="font-bold text-slate-500">單張大小上限</dt><dd className="font-black">{settings?.ocrMaxImageBytes ?? 800000} bytes</dd></div>
          <div><dt className="font-bold text-slate-500">逾時</dt><dd className="font-black">{settings?.ocrTimeoutMs ?? 12000} ms</dd></div>
        </dl>
      </section>

      <section className="surface mt-4 p-4">
        <h2 className="text-lg font-black">排程與通知參數</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div><dt className="font-bold text-slate-500">Check Mode</dt><dd className="font-black">{settings?.checkMode ?? "fetch"}</dd></div>
          <div><dt className="font-bold text-slate-500">每次最多檢查</dt><dd className="font-black">{settings?.maxTargetsPerCron ?? 1}</dd></div>
          <div><dt className="font-bold text-slate-500">最小目標間隔</dt><dd className="font-black">{formatSeconds(settings?.minCheckIntervalSeconds)}</dd></div>
          <div><dt className="font-bold text-slate-500">預設目標間隔</dt><dd className="font-black">{formatSeconds(settings?.defaultCheckIntervalSeconds)}</dd></div>
          <div><dt className="font-bold text-slate-500">通知去重</dt><dd className="font-black">{settings?.notificationDedupeMinutes ?? 60} 分鐘</dd></div>
          <div><dt className="font-bold text-slate-500">錯誤去重</dt><dd className="font-black">{settings?.errorDedupeMinutes ?? 60} 分鐘</dd></div>
          <div><dt className="font-bold text-slate-500">安靜時段</dt><dd className="font-black">{settings?.quietHoursEnabled ? `${settings.quietHoursStart}–${settings.quietHoursEnd}` : "未啟用"}</dd></div>
          <div><dt className="font-bold text-slate-500">時區</dt><dd className="font-black">{settings?.quietHoursTimezone ?? "Asia/Taipei"}</dd></div>
        </dl>
      </section>

      <section className="surface mt-4 p-4">
        <div className="flex items-center gap-2 text-teal-800">
          <ShieldCheck size={22} />
          <h2 className="text-lg font-black">安全限制</h2>
        </div>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
          本工具只監控公開售票頁並發送通知；不會登入、選位、加入購物車、結帳、付款，也不會繞過 CAPTCHA、Cloudflare、Turnstile 或排隊系統。
        </p>
      </section>
    </main>
  );
}

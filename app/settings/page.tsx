"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCircle2, ShieldCheck } from "lucide-react";

type SettingsState = {
  telegramConfigured: boolean;
  discordConfigured: boolean;
  cronSecretConfigured: boolean;
  cronSecretMasked: string;
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
  ocrEnabled: boolean;
  ocrMode: string;
  ocrLang: string;
  ocrMaxImagesPerCheck: number;
  ocrMaxImageBytes: number;
  ocrTimeoutMs: number;
  ocrAllowCrossOrigin: boolean;
  cronEndpointHint: string;
};

type TestResult = {
  channel: string;
  status: string;
  error?: string;
};

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
    if (typeof window === "undefined") return "/api/cron/check?secret=****";
    return `${window.location.origin}/api/cron/check?secret=${settings?.cronSecretMasked || "****"}`;
  }, [settings?.cronSecretMasked]);

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
          Secret 只從 Vercel 環境變數讀取，畫面不會顯示完整 token、webhook 或資料庫連線字串。
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {[
          ["Telegram", settings?.telegramConfigured],
          ["Discord", settings?.discordConfigured],
          ["Cron Secret", settings?.cronSecretConfigured]
        ].map(([label, value]) => (
          <div className="surface p-4" key={String(label)}>
            <div className="flex items-center gap-2 text-teal-700">
              <CheckCircle2 size={20} />
              <h2 className="font-black">{label}</h2>
            </div>
            <p className="mt-2 text-2xl font-black">{value ? "已設定" : "未設定"}</p>
          </div>
        ))}
        <div className="surface p-4">
          <div className="flex items-center gap-2 text-teal-700">
            <Bell size={20} />
            <h2 className="font-black">通知測試</h2>
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
        </div>
      </section>

      <section className="surface mt-4 p-4">
        <h2 className="text-lg font-black">外部 Scheduler 設定教學</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
          Vercel Hobby 內建 Cron 保持每日一次；若要接近每 5 分鐘檢查，請用 cron-job.org、GitHub Actions 或 UptimeRobot 呼叫 cron endpoint。
        </p>
        <div className="mt-3 rounded-md bg-slate-100 p-3 text-sm font-bold text-slate-800">
          {endpoint}
        </div>
        <p className="mt-2 text-xs font-semibold text-slate-500">
          畫面只顯示 masked secret。完整 secret 請到 Vercel env 查看，不要貼到公開地方。
        </p>
        <ol className="mt-3 grid gap-2 text-sm font-semibold text-slate-700">
          <li>1. cron-job.org：Method GET，URL 填上方 endpoint，每 5 分鐘。</li>
          <li>2. GitHub Actions：設定 `TICKET_RADAR_CRON_SECRET` 與 `TICKET_RADAR_CRON_URL` secrets。</li>
          <li>3. UptimeRobot：HTTP(s) monitor，每 5 分鐘；非 200 可能被視為 down。</li>
        </ol>
      </section>

      <section className="surface mt-4 p-4">
        <h2 className="text-lg font-black">公開票況圖片 OCR</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
          OCR 只用來輔助辨識公開售票頁上的餘票圖片文字。系統會先偵測 CAPTCHA、Cloudflare、排隊與登入頁；
          一旦命中就停止檢查，不會辨識驗證碼、不會解 challenge，也不會進入購票流程。
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="font-bold text-slate-500">OCR 狀態</dt>
            <dd className="font-black">{settings?.ocrEnabled ? "已啟用" : "未啟用"}</dd>
          </div>
          <div>
            <dt className="font-bold text-slate-500">OCR 模式</dt>
            <dd className="font-black">{settings?.ocrMode ?? "tesseract"}</dd>
          </div>
          <div>
            <dt className="font-bold text-slate-500">語言</dt>
            <dd className="font-black">{settings?.ocrLang ?? "eng+chi_tra"}</dd>
          </div>
          <div>
            <dt className="font-bold text-slate-500">每次最多圖片</dt>
            <dd className="font-black">{settings?.ocrMaxImagesPerCheck ?? 3}</dd>
          </div>
          <div>
            <dt className="font-bold text-slate-500">單張大小上限</dt>
            <dd className="font-black">{settings?.ocrMaxImageBytes ?? 800000} bytes</dd>
          </div>
          <div>
            <dt className="font-bold text-slate-500">逾時</dt>
            <dd className="font-black">{settings?.ocrTimeoutMs ?? 12000} ms</dd>
          </div>
        </dl>
      </section>

      <section className="surface mt-4 p-4">
        <h2 className="text-lg font-black">排程與通知參數</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="font-bold text-slate-500">Vercel 內建 Cron</dt>
            <dd className="font-black">每日 01:00</dd>
          </div>
          <div>
            <dt className="font-bold text-slate-500">Check Mode</dt>
            <dd className="font-black">{settings?.checkMode ?? "fetch"}</dd>
          </div>
          <div>
            <dt className="font-bold text-slate-500">每次最多檢查</dt>
            <dd className="font-black">{settings?.maxTargetsPerCron ?? 2}</dd>
          </div>
          <div>
            <dt className="font-bold text-slate-500">最小間隔</dt>
            <dd className="font-black">{settings?.minCheckIntervalSeconds ?? 120}s</dd>
          </div>
          <div>
            <dt className="font-bold text-slate-500">通知去重時間</dt>
            <dd className="font-black">{settings?.notificationDedupeMinutes ?? 30} 分鐘</dd>
          </div>
          <div>
            <dt className="font-bold text-slate-500">錯誤通知去重</dt>
            <dd className="font-black">{settings?.errorDedupeMinutes ?? 15} 分鐘</dd>
          </div>
          <div>
            <dt className="font-bold text-slate-500">安靜時段</dt>
            <dd className="font-black">{settings?.quietHoursEnabled ? "已啟用" : "尚未啟用"}</dd>
          </div>
          <div>
            <dt className="font-bold text-slate-500">時區</dt>
            <dd className="font-black">{settings?.quietHoursTimezone ?? "Asia/Taipei"}</dd>
          </div>
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

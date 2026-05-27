import { AlertTriangle, Bell, Clock, Radar, ShieldCheck, Target as TargetIcon } from "lucide-react";
import { RunTable } from "@/components/RunTable";
import { StatCard } from "@/components/StatCard";
import { listNotificationEvents } from "@/src/server/notifications";
import { countAlerts, listRuns } from "@/src/server/runs";
import { getConfiguredStatus } from "@/src/server/settings";
import { countTargets, listTargets } from "@/src/server/targets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function DashboardPage() {
  const [targetCounts, runs, alerts, targets, notifications] = await Promise.all([
    countTargets(),
    listRuns(5),
    countAlerts(),
    listTargets(),
    listNotificationEvents(20)
  ]);
  const settings = getConfiguredStatus();

  return (
    <main className="page-shell">
      <section className="mb-5">
        <p className="text-sm font-black uppercase tracking-normal text-teal-700">Ticket Radar</p>
        <h1 className="mt-1 text-3xl font-black tracking-normal sm:text-4xl">票券釋票雷達</h1>
        <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
          低頻率監控公開售票頁，有疑似釋票就通知你；購票仍需手動完成。
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="啟用中的監控" value={targetCounts.activeTargets} icon={<TargetIcon size={22} />} />
        <StatCard label="已啟用項目" value={targetCounts.enabledTargets} icon={<Radar size={22} />} />
        <StatCard label="未啟用模板" value={targetCounts.disabledTemplates} icon={<Clock size={22} />} />
        <StatCard label="近期通知" value={alerts} icon={<Bell size={22} />} />
      </section>

      {targetCounts.activeTargets === 0 ? (
        <section className="surface mt-4 p-4">
          <h2 className="text-lg font-black">尚未建立監控目標</h2>
          <ol className="mt-3 grid gap-2 text-sm font-semibold text-slate-700">
            <li>1. 到 Targets 新增官方售票頁。</li>
            <li>2. 設定關鍵字與票區。</li>
            <li>3. 按手動檢查確認結果。</li>
            <li>4. 設定外部 Scheduler。</li>
            <li>5. 設定 Telegram 或 Discord 通知。</li>
          </ol>
        </section>
      ) : null}

      {!settings.telegramConfigured && !settings.discordConfigured ? (
        <section className="surface mt-4 p-4">
          <h2 className="text-lg font-black">尚未設定通知</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
            你仍可在 History 查看紀錄；若要手機通知，請到 Vercel 設定 Telegram 或 Discord env。
          </p>
        </section>
      ) : null}

      <section className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="surface p-4">
          <div className="flex items-center gap-2 text-teal-800">
            <ShieldCheck size={22} />
            <h2 className="text-lg font-black">安全模式</h2>
          </div>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
            本工具只做公開頁面低頻率監控與通知；不會登入、選位、加入購物車、結帳、付款，也不會繞過驗證或排隊系統。
          </p>
        </div>
        <div className="surface p-4">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle size={22} />
            <h2 className="text-lg font-black">排程模式</h2>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="font-bold text-slate-500">Vercel 內建 Cron</dt>
              <dd className="font-black">每日 01:00</dd>
            </div>
            <div>
              <dt className="font-bold text-slate-500">外部 Scheduler</dt>
              <dd className="font-black">建議每 5 分鐘</dd>
            </div>
            <div>
              <dt className="font-bold text-slate-500">每次最多檢查</dt>
              <dd className="font-black">{settings.maxTargetsPerCron}</dd>
            </div>
            <div>
              <dt className="font-bold text-slate-500">目前 Check Mode</dt>
              <dd className="font-black">{settings.checkMode}</dd>
            </div>
            <div>
              <dt className="font-bold text-slate-500">Cron Secret</dt>
              <dd className="font-black">{settings.cronSecretConfigured ? "已設定" : "未設定"}</dd>
            </div>
            <div>
              <dt className="font-bold text-slate-500">實際頻率</dt>
              <dd className="font-black">受 target interval 限制</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="mt-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-xl font-black">最新檢查紀錄</h2>
          <a className="text-sm font-black text-teal-700" href="/history">
            查看全部
          </a>
        </div>
        <RunTable runs={runs} targets={targets} notifications={notifications} compact />
      </section>
    </main>
  );
}

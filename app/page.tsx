import { AlertTriangle, Bell, Clock, Radar, ShieldCheck, Target as TargetIcon } from "lucide-react";
import { RunTable } from "@/components/RunTable";
import { StatCard } from "@/components/StatCard";
import { countAlerts, listRuns } from "@/src/server/runs";
import { getConfiguredStatus } from "@/src/server/settings";
import { countTargets } from "@/src/server/targets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function DashboardPage() {
  const [targetCounts, runs, alerts] = await Promise.all([
    countTargets(),
    listRuns(5),
    countAlerts()
  ]);
  const settings = getConfiguredStatus();

  return (
    <main className="page-shell">
      <section className="mb-5">
        <p className="text-sm font-black uppercase tracking-normal text-teal-700">Ticket Radar</p>
        <h1 className="mt-1 text-3xl font-black tracking-normal sm:text-4xl">票券釋票雷達</h1>
        <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
          Low-frequency public page monitoring with manual purchase only. No login, seat selection,
          checkout, payment, CAPTCHA bypass, queue bypass, or stealth automation.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active targets" value={targetCounts.activeTargets} icon={<TargetIcon size={22} />} />
        <StatCard label="Enabled targets" value={targetCounts.enabledTargets} icon={<Radar size={22} />} />
        <StatCard label="Disabled templates" value={targetCounts.disabledTemplates} icon={<Clock size={22} />} />
        <StatCard label="Recent alerts" value={alerts} icon={<Bell size={22} />} />
      </section>

      <section className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="surface p-4">
          <div className="flex items-center gap-2 text-teal-800">
            <ShieldCheck size={22} />
            <h2 className="text-lg font-black">Safety mode</h2>
          </div>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
            Ticket Radar stops when bot checks, queue pages, or login requirements are detected and
            sends a notification for manual handling. It never clicks purchase-flow buttons or
            submits ticketing forms.
          </p>
        </div>
        <div className="surface p-4">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle size={22} />
            <h2 className="text-lg font-black">Cron mode</h2>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="font-bold text-slate-500">Schedule</dt>
              <dd className="font-black">Every 5 minutes</dd>
            </div>
            <div>
              <dt className="font-bold text-slate-500">Check mode</dt>
              <dd className="font-black">{settings.checkMode}</dd>
            </div>
            <div>
              <dt className="font-bold text-slate-500">Telegram</dt>
              <dd className="font-black">{settings.telegramConfigured ? "Configured" : "Not set"}</dd>
            </div>
            <div>
              <dt className="font-bold text-slate-500">Discord</dt>
              <dd className="font-black">{settings.discordConfigured ? "Configured" : "Not set"}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="mt-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-xl font-black">Latest checks</h2>
          <a className="text-sm font-black text-teal-700" href="/history">
            View all
          </a>
        </div>
        <RunTable runs={runs} />
      </section>
    </main>
  );
}

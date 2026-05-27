import { RunTable } from "@/components/RunTable";
import { listNotificationEvents } from "@/src/server/notifications";
import { listRuns } from "@/src/server/runs";
import { listTargets } from "@/src/server/targets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function HistoryPage() {
  const [runs, targets, notifications] = await Promise.all([
    listRuns(50),
    listTargets(),
    listNotificationEvents(100)
  ]);

  return (
    <main className="page-shell">
      <section className="mb-5">
        <p className="text-sm font-black uppercase tracking-normal text-teal-700">檢查紀錄</p>
        <h1 className="mt-1 text-3xl font-black tracking-normal">最近檢查紀錄</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
          查看狀態、命中關鍵字、票區、通知狀態、錯誤訊息與官方頁面連結。
        </p>
      </section>
      <RunTable runs={runs} targets={targets} notifications={notifications} />
    </main>
  );
}

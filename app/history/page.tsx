import { RunTable } from "@/components/RunTable";
import { listRuns } from "@/src/server/runs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function HistoryPage() {
  const runs = await listRuns(50);

  return (
    <main className="page-shell">
      <section className="mb-5">
        <p className="text-sm font-black uppercase tracking-normal text-teal-700">History</p>
        <h1 className="mt-1 text-3xl font-black tracking-normal">最近檢查紀錄</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
          Recent target checks, matched keywords, bot checks, queue detections, and errors.
        </p>
      </section>
      <RunTable runs={runs} />
    </main>
  );
}

import { TargetForm } from "@/components/TargetForm";
import { TargetList } from "@/components/TargetList";
import { PLATFORM_DEFAULTS } from "@/src/shared/platformDefaults";
import { listTargets } from "@/src/server/targets";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function TargetsPage() {
  const targets = await listTargets();

  return (
    <main className="page-shell">
      <section className="mb-5">
        <p className="text-sm font-black uppercase tracking-normal text-teal-700">監控目標</p>
        <h1 className="mt-1 text-3xl font-black tracking-normal">監控目標</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
          平台選單只會決定預設模板與分類。若要真正監控釋票，仍需貼上官方實際售票頁網址。
          不要啟用 YOUR_EVENT_URL、YOUR_EVENT_ID 或 example.com 這類 placeholder。
        </p>
        <Link className="btn btn-secondary mt-3 inline-flex" href="/manual-parse">
          前往 Manual Parse 手動票區解析
        </Link>
      </section>

      <section className="surface mb-5 p-4">
        <h2 className="mb-3 text-lg font-black">新增監控目標</h2>
        <TargetForm platforms={PLATFORM_DEFAULTS} />
      </section>

      <TargetList targets={targets} platforms={PLATFORM_DEFAULTS} />
    </main>
  );
}

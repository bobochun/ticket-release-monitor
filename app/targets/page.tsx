import { TargetForm } from "@/components/TargetForm";
import { TargetList } from "@/components/TargetList";
import { PLATFORMS } from "@/src/server/platforms";
import { listTargets } from "@/src/server/targets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function TargetsPage() {
  const targets = await listTargets();

  return (
    <main className="page-shell">
      <section className="mb-5">
        <p className="text-sm font-black uppercase tracking-normal text-teal-700">Targets</p>
        <h1 className="mt-1 text-3xl font-black tracking-normal">監控目標</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
          Add official ticket pages, tune keywords, manually check one target, or enable low-frequency cron polling.
        </p>
      </section>

      <section className="surface mb-5 p-4">
        <h2 className="mb-3 text-lg font-black">Add target</h2>
        <TargetForm platforms={PLATFORMS} />
      </section>

      <TargetList targets={targets} platforms={PLATFORMS} />
    </main>
  );
}

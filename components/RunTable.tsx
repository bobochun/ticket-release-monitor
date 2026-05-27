import type { CheckRun } from "@/src/shared/types";
import { StatusBadge } from "./StatusBadge";

export function RunTable({ runs }: { runs: CheckRun[] }) {
  if (runs.length === 0) {
    return <p className="surface p-4 text-sm font-semibold text-slate-600">No check history yet.</p>;
  }

  return (
    <div className="grid gap-3">
      {runs.map((run) => (
        <article key={run.id} className="surface p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-black">{run.targetName}</h2>
              <p className="mt-1 text-sm text-slate-600">{new Date(run.checkedAt).toLocaleString()}</p>
            </div>
            <StatusBadge status={run.status} />
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-700">{run.message}</p>
          <div className="mt-3 grid gap-2 text-sm text-slate-600">
            <p>
              <span className="font-bold text-slate-800">Matched:</span>{" "}
              {[...run.matchedKeywords, ...run.matchedAreas, ...run.matchedPrices].join(", ") || "none"}
            </p>
            {run.error ? (
              <p className="rounded-md bg-red-50 p-2 font-semibold text-red-700">{run.error}</p>
            ) : null}
            <a className="font-bold text-teal-700" href={run.url} target="_blank" rel="noreferrer">
              Open official page
            </a>
          </div>
        </article>
      ))}
    </div>
  );
}

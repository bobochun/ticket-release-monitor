"use client";

import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import type { DiscoveredCandidate, DiscoveryRule } from "@/src/shared/types";

export default function DiscoveryPage() {
  const [rules, setRules] = useState<DiscoveryRule[]>([]);
  const [candidates, setCandidates] = useState<DiscoveredCandidate[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/discovery-rules", { cache: "no-store" });
    const body = await response.json();
    setRules(body.rules || []);
    setCandidates(body.candidates || []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function runRule(id: number) {
    setBusyId(id);
    setMessage(null);
    const response = await fetch(`/api/discovery-rules/${id}/run`, { method: "POST" });
    const body = await response.json().catch(() => ({}));
    setMessage(response.ok ? `Found ${(body.candidates || []).length} candidates.` : body.error || "Discovery failed");
    setBusyId(null);
    await load();
  }

  async function addTarget(id: number) {
    setBusyId(id);
    const response = await fetch(`/api/candidates/${id}/add-target`, { method: "POST" });
    const body = await response.json().catch(() => ({}));
    setMessage(response.ok ? "Candidate added as a disabled target." : body.error || "Add target failed");
    setBusyId(null);
    await load();
  }

  return (
    <main className="page-shell">
      <section className="mb-5">
        <p className="text-sm font-black uppercase tracking-normal text-teal-700">Discovery</p>
        <h1 className="mt-1 text-3xl font-black tracking-normal">候選連結搜尋</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
          MVP discovery only reads public links from seed pages. It does not login, click purchase flows,
          bypass verification, or run automatically from production cron.
        </p>
      </section>

      {message ? <p className="surface mb-4 p-3 text-sm font-bold text-teal-800">{message}</p> : null}

      <section className="grid gap-3">
        {rules.map((rule) => (
          <article key={rule.id} className="surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black">{rule.name}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  {rule.platform} · max {rule.maxCandidates} candidates · {rule.enabled ? "enabled" : "manual only"}
                </p>
              </div>
              <button className="btn btn-primary" onClick={() => runRule(rule.id)} disabled={busyId === rule.id}>
                <Search size={17} />
                Run
              </button>
            </div>
            <p className="mt-3 break-all text-xs font-semibold text-slate-500">{rule.seedUrls.join(", ")}</p>
          </article>
        ))}
      </section>

      <section className="mt-5">
        <h2 className="mb-3 text-xl font-black">Candidates</h2>
        <div className="grid gap-3">
          {candidates.length === 0 ? (
            <p className="surface p-4 text-sm font-semibold text-slate-600">No candidates yet.</p>
          ) : (
            candidates.map((candidate) => (
              <article key={candidate.id} className="surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="break-words text-base font-black">{candidate.title}</h3>
                    <a className="mt-1 block break-all text-sm font-bold text-teal-700" href={candidate.url} target="_blank" rel="noreferrer">
                      {candidate.url}
                    </a>
                    <p className="mt-2 text-sm text-slate-600">
                      Score {candidate.score} · {candidate.matchedKeywords.join(", ") || "no keyword details"}
                    </p>
                  </div>
                  <button className="btn btn-secondary" onClick={() => addTarget(candidate.id)} disabled={busyId === candidate.id || candidate.addedToTargets}>
                    <Plus size={17} />
                    {candidate.addedToTargets ? "Added" : "Add target"}
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

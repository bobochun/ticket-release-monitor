"use client";

import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import type { DiscoveredCandidate, DiscoveryRule } from "@/src/shared/types";
import { getPlatformDefault } from "@/src/shared/platformDefaults";

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
    setMessage(response.ok ? `已找到 ${(body.candidates || []).length} 個候選連結。` : body.error || "候選搜尋失敗。");
    setBusyId(null);
    await load();
  }

  async function addTarget(id: number) {
    setBusyId(id);
    const response = await fetch(`/api/candidates/${id}/add-target`, { method: "POST" });
    const body = await response.json().catch(() => ({}));
    setMessage(response.ok ? "已加入監控目標，預設為停用。請確認 URL 後手動啟用。" : body.error || "加入監控目標失敗。");
    setBusyId(null);
    await load();
  }

  return (
    <main className="page-shell">
      <section className="mb-5">
        <p className="text-sm font-black uppercase tracking-normal text-teal-700">候選搜尋</p>
        <h1 className="mt-1 text-3xl font-black tracking-normal">候選活動頁搜尋</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
          此功能會從你設定的公開入口頁擷取連結，依日期、場地、隊伍、票區關鍵字找可能的活動頁。
          它不會登入、不會進入購票流程、不會繞過驗證。
        </p>
      </section>

      {message ? <p className="surface mb-4 p-3 text-sm font-bold text-teal-800">{message}</p> : null}

      <section className="grid gap-3">
        {rules.length === 0 ? (
          <p className="surface p-4 text-sm font-semibold text-slate-600">
            尚未建立 discovery rules。可先執行 `npm run seed` 建立預設規則。
          </p>
        ) : (
          rules.map((rule) => (
            <article key={rule.id} className="surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black">{rule.name}</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-600">
                    {getPlatformDefault(rule.platform).labelZh} · 最多 {rule.maxCandidates} 筆 · {rule.enabled ? "已啟用" : "手動執行"}
                  </p>
                </div>
                <button className="btn btn-primary" onClick={() => runRule(rule.id)} disabled={busyId === rule.id}>
                  <Search size={17} />
                  {busyId === rule.id ? "搜尋中..." : "手動搜尋候選連結"}
                </button>
              </div>
              <p className="mt-3 break-all text-xs font-semibold text-slate-500">{rule.seedUrls.join(", ")}</p>
            </article>
          ))
        )}
      </section>

      <section className="mt-5">
        <h2 className="mb-3 text-xl font-black">候選結果</h2>
        <div className="grid gap-3">
          {candidates.length === 0 ? (
            <p className="surface p-4 text-sm font-semibold text-slate-600">
              尚無候選結果。請先手動執行上方規則。
            </p>
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
                      分數 {candidate.score} · {candidate.matchedKeywords.join("、") || "沒有命中細節"}
                    </p>
                  </div>
                  <button className="btn btn-secondary" onClick={() => addTarget(candidate.id)} disabled={busyId === candidate.id || candidate.addedToTargets}>
                    <Plus size={17} />
                    {candidate.addedToTargets ? "已加入" : "加入監控目標"}
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

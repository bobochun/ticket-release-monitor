"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Play, Power, Search, Trash2 } from "lucide-react";
import type { Target } from "@/src/shared/types";
import { getPlatformDefault, isPlaceholderUrl, type PlatformDefault } from "@/src/shared/platformDefaults";
import { statusLabel } from "@/src/shared/status";
import { StatusBadge } from "./StatusBadge";
import { TargetForm } from "./TargetForm";

function formatTime(value: string | null): string {
  if (!value) return "尚未檢查";
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function TargetList({
  targets,
  platforms
}: {
  targets: Target[];
  platforms: PlatformDefault[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");

  const filteredTargets = useMemo(() => {
    return targets.filter((target) => {
      const keyword = query.trim().toLowerCase();
      const matchesQuery =
        !keyword ||
        target.name.toLowerCase().includes(keyword) ||
        target.url.toLowerCase().includes(keyword) ||
        getPlatformDefault(target.platform).labelZh.toLowerCase().includes(keyword);
      const matchesState =
        stateFilter === "all" ||
        (stateFilter === "enabled" && target.enabled && !target.isTemplate) ||
        (stateFilter === "disabled" && !target.enabled && !target.isTemplate) ||
        (stateFilter === "template" && target.isTemplate);
      const matchesPlatform = platformFilter === "all" || target.platform === platformFilter;
      return matchesQuery && matchesState && matchesPlatform;
    });
  }, [platformFilter, query, stateFilter, targets]);

  async function patchTarget(target: Target, enabled: boolean) {
    setBusyId(target.id);
    setMessage(null);
    const response = await fetch(`/api/targets/${target.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled })
    });
    const body = await response.json().catch(() => ({}));
    setMessage(response.ok ? "狀態已更新。" : body.error || "更新失敗。");
    setBusyId(null);
    router.refresh();
  }

  async function manualCheck(target: Target) {
    setBusyId(target.id);
    setMessage(null);
    const response = await fetch(`/api/targets/${target.id}/check`, { method: "POST" });
    const body = await response.json().catch(() => ({}));
    setMessage(
      response.ok
        ? `${target.name}：${statusLabel(body.result.status)}，${body.result.message}`
        : body.error || "手動檢查失敗。"
    );
    setBusyId(null);
    router.refresh();
  }

  async function remove(target: Target) {
    if (!window.confirm(`確定刪除「${target.name}」嗎？`)) return;
    setBusyId(target.id);
    await fetch(`/api/targets/${target.id}`, { method: "DELETE" });
    setBusyId(null);
    router.refresh();
  }

  if (targets.length === 0) {
    return (
      <section className="surface p-4">
        <h2 className="text-lg font-black">尚未建立監控目標</h2>
        <ol className="mt-3 grid gap-2 text-sm font-semibold text-slate-700">
          <li>1. 到 Targets 新增官方售票頁。</li>
          <li>2. 設定關鍵字與票區。</li>
          <li>3. 按手動檢查確認結果。</li>
          <li>4. 設定外部 Scheduler 每 5 分鐘呼叫 cron endpoint。</li>
          <li>5. 設定 Telegram 或 Discord 通知。</li>
        </ol>
      </section>
    );
  }

  return (
    <div className="grid gap-3">
      <section className="surface grid gap-3 p-4 sm:grid-cols-3">
        <label className="grid gap-1 text-sm font-bold sm:col-span-1">
          搜尋 target
          <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-400" size={16} />
            <input className="field pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="名稱、網址、平台" />
          </div>
        </label>
        <label className="grid gap-1 text-sm font-bold">
          篩選
          <select className="field" value={stateFilter} onChange={(event) => setStateFilter(event.target.value)}>
            <option value="all">全部</option>
            <option value="enabled">啟用</option>
            <option value="disabled">停用</option>
            <option value="template">模板</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-bold">
          平台
          <select className="field" value={platformFilter} onChange={(event) => setPlatformFilter(event.target.value)}>
            <option value="all">全部平台</option>
            {platforms.map((platform) => (
              <option key={platform.id} value={platform.id}>
                {platform.labelZh}
              </option>
            ))}
          </select>
        </label>
      </section>

      {message ? <p className="surface p-3 text-sm font-bold text-teal-800">{message}</p> : null}

      {filteredTargets.map((target) => {
        const platform = getPlatformDefault(target.platform);
        const placeholder = isPlaceholderUrl(target.url);

        return (
          <article key={target.id} className="surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="break-words text-lg font-black">{target.name}</h2>
                <p className="mt-1 text-sm font-bold text-teal-700">{platform.labelZh}</p>
                <p className="mt-1 break-all text-sm text-slate-600">{target.url}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={target.enabled ? "ENABLED" : "DISABLED_TARGET"} label={target.enabled ? "啟用" : "停用"} />
                {target.isTemplate ? <StatusBadge status="TEMPLATE" label="模板" /> : null}
              </div>
            </div>

            {placeholder ? (
              <p className="mt-3 rounded-md bg-red-50 p-3 text-sm font-bold text-red-700">
                這是 placeholder 模板網址，請換成實際官方售票頁後再啟用。
              </p>
            ) : null}

            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-slate-600 sm:grid-cols-4">
              <div className="rounded-md bg-slate-100 p-2">
                <dt>間隔</dt>
                <dd className="text-slate-900">{target.checkIntervalSeconds}s</dd>
              </div>
              <div className="rounded-md bg-slate-100 p-2">
                <dt>上次檢查</dt>
                <dd className="text-slate-900">{formatTime(target.lastCheckedAt)}</dd>
              </div>
              <div className="rounded-md bg-slate-100 p-2">
                <dt>下次檢查</dt>
                <dd className="text-slate-900">{formatTime(target.nextCheckAt)}</dd>
              </div>
              <div className="rounded-md bg-slate-100 p-2">
                <dt>Timeout</dt>
                <dd className="text-slate-900">{target.timeoutMs}ms</dd>
              </div>
            </dl>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:flex">
              <button className="btn btn-primary" onClick={() => manualCheck(target)} disabled={busyId === target.id}>
                <Play size={17} />
                {busyId === target.id ? "檢查中..." : "立即檢查"}
              </button>
              <a className="btn btn-secondary" href={target.url} target="_blank" rel="noreferrer">
                <ExternalLink size={17} />
                開啟官方頁面
              </a>
              <button className="btn btn-secondary" onClick={() => patchTarget(target, !target.enabled)} disabled={busyId === target.id}>
                <Power size={17} />
                {target.enabled ? "停用" : "啟用"}
              </button>
              <button className="btn btn-danger" onClick={() => remove(target)} disabled={busyId === target.id}>
                <Trash2 size={17} />
                刪除
              </button>
            </div>

            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-black text-teal-800">編輯</summary>
              <div className="mt-3 border-t border-slate-200 pt-3">
                <TargetForm target={target} platforms={platforms} />
              </div>
            </details>
          </article>
        );
      })}
    </div>
  );
}

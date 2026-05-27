"use client";

import { useMemo, useState } from "react";
import type { CheckRun, NotificationEvent, Target } from "@/src/shared/types";
import { ALERT_STATUSES, STATUS_LABEL_ZH, statusLabel } from "@/src/shared/status";
import { getPlatformDefault } from "@/src/shared/platformDefaults";
import { StatusBadge } from "./StatusBadge";

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function notificationForRun(run: CheckRun, events: NotificationEvent[]): NotificationEvent | undefined {
  return events.find((event) => event.url === run.url && event.title.startsWith(`${run.status}: ${run.targetName}`));
}

export function RunTable({
  runs,
  targets = [],
  notifications = [],
  compact = false
}: {
  runs: CheckRun[];
  targets?: Target[];
  notifications?: NotificationEvent[];
  compact?: boolean;
}) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [alertsOnly, setAlertsOnly] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);

  const targetById = useMemo(() => new Map(targets.map((target) => [target.id, target])), [targets]);
  const platforms = useMemo(
    () => [...new Set(targets.map((target) => target.platform))].sort(),
    [targets]
  );

  const filteredRuns = useMemo(() => {
    return runs.filter((run) => {
      const target = run.targetId ? targetById.get(run.targetId) : undefined;
      const matchesStatus = statusFilter === "all" || run.status === statusFilter;
      const matchesPlatform = platformFilter === "all" || target?.platform === platformFilter;
      const matchesAlert = !alertsOnly || ALERT_STATUSES.includes(run.status);
      return matchesStatus && matchesPlatform && matchesAlert;
    });
  }, [alertsOnly, platformFilter, runs, statusFilter, targetById]);

  if (runs.length === 0) {
    return <p className="surface p-4 text-sm font-semibold text-slate-600">尚無檢查紀錄。</p>;
  }

  return (
    <div className="grid gap-3">
      {!compact ? (
        <section className="surface grid gap-3 p-4 sm:grid-cols-3">
          <label className="grid gap-1 text-sm font-bold">
            狀態篩選
            <select className="field" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">全部狀態</option>
              {Object.entries(STATUS_LABEL_ZH).map(([status, label]) => (
                <option key={status} value={status}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-bold">
            平台篩選
            <select className="field" value={platformFilter} onChange={(event) => setPlatformFilter(event.target.value)}>
              <option value="all">全部平台</option>
              {platforms.map((platform) => (
                <option key={platform} value={platform}>
                  {getPlatformDefault(platform).labelZh}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-end gap-2 text-sm font-bold">
            <input type="checkbox" checked={alertsOnly} onChange={(event) => setAlertsOnly(event.target.checked)} />
            只看 alerts
          </label>
        </section>
      ) : null}

      {filteredRuns.map((run) => {
        const target = run.targetId ? targetById.get(run.targetId) : undefined;
        const platform = target ? getPlatformDefault(target.platform).labelZh : "未知平台";
        const event = notificationForRun(run, notifications);
        const isOpen = openId === run.id;

        return (
          <article key={run.id} className="surface p-4">
            <button className="w-full text-left" onClick={() => setOpenId(isOpen ? null : run.id)}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-black">{run.targetName}</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {formatTime(run.checkedAt)} · {platform} · {run.durationMs}ms
                  </p>
                </div>
                <StatusBadge status={run.status} />
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-700">{run.message}</p>
            </button>

            {isOpen || compact ? (
              <div className="mt-3 grid gap-2 border-t border-slate-200 pt-3 text-sm text-slate-600">
                <p>
                  <span className="font-bold text-slate-800">狀態：</span>
                  {statusLabel(run.status)}
                </p>
                <p>
                  <span className="font-bold text-slate-800">命中關鍵字：</span>
                  {run.matchedKeywords.join("、") || "無"}
                </p>
                <p>
                  <span className="font-bold text-slate-800">命中票區：</span>
                  {run.matchedAreas.join("、") || "無"}
                </p>
                <p>
                  <span className="font-bold text-slate-800">命中價格：</span>
                  {run.matchedPrices.join("、") || "無"}
                </p>
                <p>
                  <span className="font-bold text-slate-800">通知狀態：</span>
                  {event ? `${event.channel} / ${event.status}` : "無通知紀錄或未達通知條件"}
                </p>
                {run.error ? (
                  <p className="rounded-md bg-red-50 p-2 font-semibold text-red-700">
                    <span className="font-bold">錯誤：</span>
                    {run.error}
                  </p>
                ) : null}
                <a className="font-bold text-teal-700" href={run.url} target="_blank" rel="noreferrer">
                  開啟頁面
                </a>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

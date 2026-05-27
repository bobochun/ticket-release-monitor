"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Play, Power, Trash2 } from "lucide-react";
import type { Target } from "@/src/shared/types";
import type { PlatformInfo } from "@/src/server/platforms";
import { StatusBadge } from "./StatusBadge";
import { TargetForm } from "./TargetForm";

export function TargetList({
  targets,
  platforms
}: {
  targets: Target[];
  platforms: PlatformInfo[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function patchTarget(target: Target, enabled: boolean) {
    setBusyId(target.id);
    await fetch(`/api/targets/${target.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled })
    });
    setBusyId(null);
    router.refresh();
  }

  async function manualCheck(target: Target) {
    setBusyId(target.id);
    setMessage(null);
    const response = await fetch(`/api/targets/${target.id}/check`, { method: "POST" });
    const body = await response.json().catch(() => ({}));
    setMessage(response.ok ? `${target.name}: ${body.result.status}` : body.error || "Check failed");
    setBusyId(null);
    router.refresh();
  }

  async function remove(target: Target) {
    if (!window.confirm(`Delete ${target.name}?`)) return;
    setBusyId(target.id);
    await fetch(`/api/targets/${target.id}`, { method: "DELETE" });
    setBusyId(null);
    router.refresh();
  }

  if (targets.length === 0) {
    return <p className="surface p-4 text-sm font-semibold text-slate-600">No targets yet.</p>;
  }

  return (
    <div className="grid gap-3">
      {message ? <p className="surface p-3 text-sm font-bold text-teal-800">{message}</p> : null}
      {targets.map((target) => (
        <article key={target.id} className="surface p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="break-words text-lg font-black">{target.name}</h2>
              <p className="mt-1 break-all text-sm text-slate-600">{target.url}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={target.enabled ? "ENABLED" : "DISABLED_TARGET"} label={target.enabled ? "Enabled" : "Disabled"} />
              {target.isTemplate ? <StatusBadge status="TEMPLATE" label="Template" /> : null}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-600">
            <span className="rounded-full bg-slate-100 px-2.5 py-1">{target.platform}</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1">{target.checkIntervalSeconds}s</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1">{target.timeoutMs}ms timeout</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:flex">
            <button className="btn btn-primary" onClick={() => manualCheck(target)} disabled={busyId === target.id}>
              <Play size={17} />
              Check
            </button>
            <a className="btn btn-secondary" href={target.url} target="_blank" rel="noreferrer">
              <ExternalLink size={17} />
              Open
            </a>
            <button className="btn btn-secondary" onClick={() => patchTarget(target, !target.enabled)} disabled={busyId === target.id}>
              <Power size={17} />
              {target.enabled ? "Disable" : "Enable"}
            </button>
            <button className="btn btn-danger" onClick={() => remove(target)} disabled={busyId === target.id}>
              <Trash2 size={17} />
              Delete
            </button>
          </div>
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-black text-teal-800">Edit target</summary>
            <div className="mt-3 border-t border-slate-200 pt-3">
              <TargetForm target={target} platforms={platforms} />
            </div>
          </details>
        </article>
      ))}
    </div>
  );
}

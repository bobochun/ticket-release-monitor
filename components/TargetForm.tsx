"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import type { Target } from "@/src/shared/types";
import type { PlatformInfo } from "@/src/server/platforms";

function splitKeywords(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinKeywords(value: string[] | undefined): string {
  return (value ?? []).join("\n");
}

export function TargetForm({
  target,
  platforms,
  onSaved
}: {
  target?: Target;
  platforms: PlatformInfo[];
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") || ""),
      platform: String(form.get("platform") || "generic"),
      url: String(form.get("url") || ""),
      enabled: form.get("enabled") === "on",
      isTemplate: form.get("isTemplate") === "on",
      checkIntervalSeconds: Number(form.get("checkIntervalSeconds") || 300),
      timeoutMs: Number(form.get("timeoutMs") || 30000),
      includeKeywords: splitKeywords(String(form.get("includeKeywords") || "")),
      excludeKeywords: splitKeywords(String(form.get("excludeKeywords") || "")),
      areaKeywords: splitKeywords(String(form.get("areaKeywords") || "")),
      areaBlacklist: splitKeywords(String(form.get("areaBlacklist") || "")),
      priceKeywords: splitKeywords(String(form.get("priceKeywords") || "")),
      notes: String(form.get("notes") || "")
    };

    const response = await fetch(target ? `/api/targets/${target.id}` : "/api/targets", {
      method: target ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error || "Save failed");
      setSaving(false);
      return;
    }

    if (!target) event.currentTarget.reset();
    setSaving(false);
    onSaved?.();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-bold">
          Name
          <input className="field" name="name" defaultValue={target?.name} required />
        </label>
        <label className="grid gap-1 text-sm font-bold">
          Platform
          <select className="field" name="platform" defaultValue={target?.platform ?? "generic"}>
            {platforms.map((platform) => (
              <option key={platform.id} value={platform.id}>
                {platform.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="grid gap-1 text-sm font-bold">
        Official URL
        <input className="field" name="url" type="url" defaultValue={target?.url} required />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-bold">
          Interval seconds
          <input
            className="field"
            name="checkIntervalSeconds"
            type="number"
            min={120}
            defaultValue={target?.checkIntervalSeconds ?? 300}
          />
        </label>
        <label className="grid gap-1 text-sm font-bold">
          Timeout ms
          <input
            className="field"
            name="timeoutMs"
            type="number"
            min={5000}
            defaultValue={target?.timeoutMs ?? 30000}
          />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-bold">
          Include keywords
          <textarea className="field min-h-24" name="includeKeywords" defaultValue={joinKeywords(target?.includeKeywords)} />
        </label>
        <label className="grid gap-1 text-sm font-bold">
          Exclude keywords
          <textarea className="field min-h-24" name="excludeKeywords" defaultValue={joinKeywords(target?.excludeKeywords)} />
        </label>
        <label className="grid gap-1 text-sm font-bold">
          Area keywords
          <textarea className="field min-h-20" name="areaKeywords" defaultValue={joinKeywords(target?.areaKeywords)} />
        </label>
        <label className="grid gap-1 text-sm font-bold">
          Area blacklist
          <textarea className="field min-h-20" name="areaBlacklist" defaultValue={joinKeywords(target?.areaBlacklist)} />
        </label>
      </div>
      <label className="grid gap-1 text-sm font-bold">
        Price keywords
        <textarea className="field min-h-16" name="priceKeywords" defaultValue={joinKeywords(target?.priceKeywords)} />
      </label>
      <label className="grid gap-1 text-sm font-bold">
        Notes
        <textarea className="field min-h-16" name="notes" defaultValue={target?.notes ?? ""} />
      </label>
      <div className="flex flex-wrap gap-4 text-sm font-bold text-slate-700">
        <label className="inline-flex items-center gap-2">
          <input name="enabled" type="checkbox" defaultChecked={target?.enabled ?? true} />
          Enabled
        </label>
        <label className="inline-flex items-center gap-2">
          <input name="isTemplate" type="checkbox" defaultChecked={target?.isTemplate ?? false} />
          Template
        </label>
      </div>
      {error ? <p className="rounded-md bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
      <button className="btn btn-primary w-full sm:w-fit" type="submit" disabled={saving}>
        <Save size={18} />
        {saving ? "Saving..." : target ? "Save target" : "Add target"}
      </button>
    </form>
  );
}

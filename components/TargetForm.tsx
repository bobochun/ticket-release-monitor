"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Wand2 } from "lucide-react";
import type { Target } from "@/src/shared/types";
import {
  QUICK_TEMPLATES,
  getPlatformDefault,
  isPlaceholderUrl,
  type PlatformDefault
} from "@/src/shared/platformDefaults";

function splitKeywords(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinKeywords(value: string[] | undefined): string {
  return (value ?? []).join("\n");
}

type FormState = {
  name: string;
  platform: string;
  url: string;
  enabled: boolean;
  isTemplate: boolean;
  checkIntervalSeconds: number;
  timeoutMs: number;
  includeKeywords: string;
  excludeKeywords: string;
  eventKeywords: string;
  dateKeywords: string;
  venueKeywords: string;
  areaKeywords: string;
  areaBlacklist: string;
  priceKeywords: string;
  matchMode: Target["matchMode"];
  notifyOn: Target["notifyOn"];
  notes: string;
};

function stateFromTarget(target?: Target): FormState {
  const preset = getPlatformDefault(target?.platform ?? "generic");
  return {
    name: target?.name ?? "",
    platform: target?.platform ?? "generic",
    url: target?.url ?? "",
    enabled: target?.enabled ?? false,
    isTemplate: target?.isTemplate ?? false,
    checkIntervalSeconds: target?.checkIntervalSeconds ?? 300,
    timeoutMs: target?.timeoutMs ?? 30000,
    includeKeywords: target ? joinKeywords(target.includeKeywords) : joinKeywords(preset.includeKeywords),
    excludeKeywords: target ? joinKeywords(target.excludeKeywords) : joinKeywords(preset.excludeKeywords),
    eventKeywords: target ? joinKeywords(target.eventKeywords) : "",
    dateKeywords: target ? joinKeywords(target.dateKeywords) : "",
    venueKeywords: target ? joinKeywords(target.venueKeywords) : "",
    areaKeywords: target ? joinKeywords(target.areaKeywords) : joinKeywords(preset.areaKeywords),
    areaBlacklist: target ? joinKeywords(target.areaBlacklist) : joinKeywords(preset.areaBlacklist),
    priceKeywords: target ? joinKeywords(target.priceKeywords) : joinKeywords(preset.priceKeywords),
    matchMode: target?.matchMode ?? "strict",
    notifyOn: target?.notifyOn ?? "available_only",
    notes: target?.notes ?? preset.notes
  };
}

export function TargetForm({
  target,
  platforms,
  onSaved
}: {
  target?: Target;
  platforms: PlatformDefault[];
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(Boolean(target));
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => stateFromTarget(target));
  const preset = useMemo(() => getPlatformDefault(form.platform), [form.platform]);
  const placeholderWarning = isPlaceholderUrl(form.url);

  function update<K extends keyof FormState>(key: K, value: FormState[K], markDirty = true) {
    setForm((current) => ({ ...current, [key]: value }));
    if (markDirty) setDirty(true);
  }

  function applyPreset(platformId = form.platform, options?: { name?: string; url?: string }) {
    const next = getPlatformDefault(platformId);
    setForm((current) => ({
      ...current,
      name: options?.name ?? current.name,
      platform: platformId,
      url: (options?.url ?? current.url) || next.defaultUrlPlaceholder,
      enabled: false,
      isTemplate: current.isTemplate,
      includeKeywords: joinKeywords(next.includeKeywords),
      excludeKeywords: joinKeywords(next.excludeKeywords),
      areaKeywords: joinKeywords(next.areaKeywords),
      areaBlacklist: joinKeywords(next.areaBlacklist),
      priceKeywords: joinKeywords(next.priceKeywords),
      matchMode: "strict",
      notifyOn: "available_only",
      notes: next.notes
    }));
    setDirty(true);
    setError("已套用平台預設。請貼上實際官方售票頁網址後再啟用。");
  }

  function applyQuickTemplate(templateId: string) {
    const template = QUICK_TEMPLATES.find((item) => item.id === templateId);
    if (!template) return;
    applyPreset(template.platform, { name: template.name, url: template.url });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    if (form.enabled && isPlaceholderUrl(form.url)) {
      setError("請先貼上實際官方售票頁網址，不要啟用模板網址。");
      setSaving(false);
      return;
    }
    if (form.enabled && (form.isTemplate || form.name.includes("模板"))) {
      setError("模板不能直接啟用。請先複製成正式監控目標並移除「模板」字樣。");
      setSaving(false);
      return;
    }

    const payload = {
      name: form.name,
      platform: form.platform,
      url: form.url,
      enabled: form.enabled,
      isTemplate: form.isTemplate,
      checkIntervalSeconds: Number(form.checkIntervalSeconds || 300),
      timeoutMs: Number(form.timeoutMs || 30000),
      includeKeywords: splitKeywords(form.includeKeywords),
      excludeKeywords: splitKeywords(form.excludeKeywords),
      eventKeywords: splitKeywords(form.eventKeywords),
      dateKeywords: splitKeywords(form.dateKeywords),
      venueKeywords: splitKeywords(form.venueKeywords),
      areaKeywords: splitKeywords(form.areaKeywords),
      areaBlacklist: splitKeywords(form.areaBlacklist),
      priceKeywords: splitKeywords(form.priceKeywords),
      matchMode: form.matchMode,
      notifyOn: form.notifyOn,
      notes: form.notes
    };

    const response = await fetch(target ? `/api/targets/${target.id}` : "/api/targets", {
      method: target ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error || "儲存失敗，請檢查欄位。");
      setSaving(false);
      return;
    }

    if (!target) {
      setForm(stateFromTarget());
      setDirty(false);
    }
    setSaving(false);
    onSaved?.();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      {!target ? (
        <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-black">快速建立</h3>
            <span className="text-xs font-bold text-slate-500">預設停用，請先換成實際 URL</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {QUICK_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                className="btn btn-secondary justify-start text-left text-sm"
                onClick={() => applyQuickTemplate(template.id)}
                title={template.description}
              >
                <Wand2 size={16} />
                {template.name}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-bold">
          名稱
          <input className="field" value={form.name} onChange={(event) => update("name", event.target.value)} required />
        </label>
        <label className="grid gap-1 text-sm font-bold">
          平台
          <select
            className="field"
            value={form.platform}
            onChange={(event) => {
              const platformId = event.target.value;
              update("platform", platformId, false);
              if (!dirty && !target) applyPreset(platformId);
            }}
          >
            {platforms.map((platform) => (
              <option key={platform.id} value={platform.id}>
                {platform.labelZh}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="rounded-lg border border-teal-100 bg-teal-50 p-3 text-sm font-semibold text-teal-900">
        <p>{preset.warning}</p>
        <p className="mt-2 text-xs">
          Parser：{preset.parserId}。Strict 模式會要求同一個可用票區符合你設定的票區與價格條件。
        </p>
        <button type="button" className="btn btn-secondary mt-2" onClick={() => applyPreset()}>
          <Wand2 size={16} />
          套用平台預設
        </button>
      </div>

      <label className="grid gap-1 text-sm font-bold">
        官方售票頁網址
        <input className="field" value={form.url} onChange={(event) => update("url", event.target.value)} type="url" required />
      </label>
      {placeholderWarning ? (
        <p className="rounded-md bg-red-50 p-3 text-sm font-bold text-red-700">
          這是模板網址。請先貼上實際官方售票頁網址，不要啟用模板網址。
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-bold">
          檢查間隔秒數
          <input
            className="field"
            type="number"
            min={120}
            value={form.checkIntervalSeconds}
            onChange={(event) => update("checkIntervalSeconds", Number(event.target.value))}
          />
        </label>
        <label className="grid gap-1 text-sm font-bold">
          Timeout ms
          <input
            className="field"
            type="number"
            min={5000}
            value={form.timeoutMs}
            onChange={(event) => update("timeoutMs", Number(event.target.value))}
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-bold">
          比對模式
          <select className="field" value={form.matchMode} onChange={(event) => update("matchMode", event.target.value as Target["matchMode"])}>
            <option value="strict">嚴格：日期、場館、票區、價格都要符合</option>
            <option value="normal">一般：票區或價格符合即可</option>
            <option value="loose">寬鬆：任一可用票區都列為可能符合</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-bold">
          通知門檻
          <select className="field" value={form.notifyOn} onChange={(event) => update("notifyOn", event.target.value as Target["notifyOn"])}>
            <option value="available_only">只在符合條件時通知</option>
            <option value="available_and_possible">符合或可能符合都通知</option>
            <option value="all">全部狀態都通知</option>
          </select>
          <span className="text-xs font-semibold text-slate-500">
            建議使用「只在符合條件時通知」，避免收到不符合需求的有票提醒。
          </span>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1 text-sm font-bold">
          活動關鍵字
          <textarea className="field min-h-16" value={form.eventKeywords} onChange={(event) => update("eventKeywords", event.target.value)} />
        </label>
        <label className="grid gap-1 text-sm font-bold">
          日期關鍵字
          <textarea className="field min-h-16" value={form.dateKeywords} onChange={(event) => update("dateKeywords", event.target.value)} placeholder="例如 2026/06/14" />
        </label>
        <label className="grid gap-1 text-sm font-bold">
          場館關鍵字
          <textarea className="field min-h-16" value={form.venueKeywords} onChange={(event) => update("venueKeywords", event.target.value)} placeholder="例如 新莊棒球場" />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-bold">
          有票關鍵字
          <textarea className="field min-h-24" value={form.includeKeywords} onChange={(event) => update("includeKeywords", event.target.value)} />
        </label>
        <label className="grid gap-1 text-sm font-bold">
          排除關鍵字
          <textarea className="field min-h-24" value={form.excludeKeywords} onChange={(event) => update("excludeKeywords", event.target.value)} />
        </label>
        <label className="grid gap-1 text-sm font-bold">
          票區關鍵字
          <textarea className="field min-h-20" value={form.areaKeywords} onChange={(event) => update("areaKeywords", event.target.value)} />
          <span className="text-xs font-semibold text-slate-500">
            請填你真正想要的票區，例如 熱區、A9區、內野C區。若空白，任何可用票區都可能被視為 possible match。
          </span>
        </label>
        <label className="grid gap-1 text-sm font-bold">
          排除票區
          <textarea className="field min-h-20" value={form.areaBlacklist} onChange={(event) => update("areaBlacklist", event.target.value)} />
        </label>
      </div>

      <label className="grid gap-1 text-sm font-bold">
        價格關鍵字
        <textarea className="field min-h-16" value={form.priceKeywords} onChange={(event) => update("priceKeywords", event.target.value)} />
        <span className="text-xs font-semibold text-slate-500">
          價格會精準比對，例如填 900 只會匹配票價 900，不會匹配 550 或 1900。
        </span>
      </label>
      <label className="grid gap-1 text-sm font-bold">
        備註
        <textarea className="field min-h-16" value={form.notes} onChange={(event) => update("notes", event.target.value)} />
      </label>

      <div className="flex flex-wrap gap-4 text-sm font-bold text-slate-700">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={form.enabled} onChange={(event) => update("enabled", event.target.checked)} />
          啟用
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={form.isTemplate} onChange={(event) => update("isTemplate", event.target.checked)} />
          模板
        </label>
      </div>

      {error ? <p className="rounded-md bg-amber-50 p-3 text-sm font-bold text-amber-800">{error}</p> : null}
      <button className="btn btn-primary w-full sm:w-fit" type="submit" disabled={saving}>
        <Save size={18} />
        {saving ? "儲存中..." : target ? "儲存監控目標" : "新增監控目標"}
      </button>
    </form>
  );
}

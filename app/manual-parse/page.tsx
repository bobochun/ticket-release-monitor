"use client";

import { useEffect, useState } from "react";
import { FileSearch } from "lucide-react";
import { getPlatformDefault, PLATFORM_DEFAULTS } from "@/src/shared/platformDefaults";
import { statusLabel } from "@/src/shared/status";
import type { CheckResult, Target } from "@/src/shared/types";

export default function ManualParsePage() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [platform, setPlatform] = useState("cpbl_ctbc_brothers");
  const [url, setUrl] = useState("");
  const [contentType, setContentType] = useState<"text" | "html">("text");
  const [content, setContent] = useState("");
  const [targetId, setTargetId] = useState("");
  const [saveRun, setSaveRun] = useState(true);
  const [sendNotification, setSendNotification] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/targets", { cache: "no-store" })
      .then((response) => response.json())
      .then((body) => setTargets(body.targets || []))
      .catch(() => setTargets([]));
  }, []);

  const selectedTarget = targets.find((target) => String(target.id) === targetId);
  const platformInfo = getPlatformDefault(selectedTarget?.platform || platform);

  useEffect(() => {
    if (!selectedTarget) return;
    setPlatform(selectedTarget.platform);
    setUrl(selectedTarget.url);
  }, [selectedTarget]);

  async function submit() {
    setBusy(true);
    setMessage(null);
    setResult(null);
    const response = await fetch("/api/manual-parse", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        platform,
        url,
        contentType,
        content,
        targetId: targetId ? Number(targetId) : undefined,
        saveRun,
        sendNotification
      })
    });
    const body = await response.json().catch(() => ({}));
    if (response.ok) {
      setResult(body.result);
      setMessage("Manual Parse 已完成。");
    } else {
      setMessage(body.error || "Manual Parse 失敗。");
    }
    setBusy(false);
  }

  return (
    <main className="page-shell">
      <section className="mb-5">
        <p className="text-sm font-black uppercase tracking-normal text-teal-700">Manual Parse</p>
        <h1 className="mt-1 text-3xl font-black tracking-normal">手動票區解析</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
          當伺服器 fetch 因 session、排隊或平台限制看不到完整內容時，請在自己的瀏覽器開官方頁面，
          只貼上公開票區文字或 HTML。系統不解析驗證碼、不登入、不進入購票流程。
        </p>
      </section>

      <section className="surface grid gap-4 p-4">
        <div className="flex items-center gap-2 text-teal-800">
          <FileSearch size={22} />
          <h2 className="text-lg font-black">解析輸入</h2>
        </div>
        <label className="grid gap-1 text-sm font-bold">
          對應 target（可選）
          <select className="field" value={targetId} onChange={(event) => setTargetId(event.target.value)}>
            <option value="">不指定 target</option>
            {targets.map((target) => (
              <option key={target.id} value={target.id}>
                {target.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-bold">
          平台
          <select className="field" value={platform} onChange={(event) => setPlatform(event.target.value)} disabled={Boolean(selectedTarget)}>
            {PLATFORM_DEFAULTS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.labelZh}
              </option>
            ))}
          </select>
        </label>
        <div className="rounded-md bg-teal-50 p-3 text-sm font-semibold text-teal-900">
          Parser：{platformInfo.parserId}。售完只代表單一票區，不會直接判整場無票。
        </div>
        <label className="grid gap-1 text-sm font-bold">
          官方 URL
          <input className="field" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://..." />
        </label>
        <label className="grid gap-1 text-sm font-bold">
          內容類型
          <select className="field" value={contentType} onChange={(event) => setContentType(event.target.value as "text" | "html")}>
            <option value="text">text</option>
            <option value="html">html</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-bold">
          公開票區內容
          <textarea
            className="field min-h-64"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={"例如：\n內野南A區下層 400 熱賣中\n內野西C區下層 500 8\n內野D區下層 500 售完"}
          />
        </label>
        <div className="flex flex-wrap gap-4 text-sm font-bold">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={saveRun} onChange={(event) => setSaveRun(event.target.checked)} />
            儲存到 History
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={sendNotification} onChange={(event) => setSendNotification(event.target.checked)} />
            發送通知
          </label>
        </div>
        <button className="btn btn-primary" onClick={submit} disabled={busy || !url || !content}>
          {busy ? "解析中..." : "開始解析"}
        </button>
      </section>

      {message ? <p className="surface mt-4 p-3 text-sm font-bold text-teal-900">{message}</p> : null}

      {result ? (
        <section className="surface mt-4 p-4">
          <h2 className="text-lg font-black">解析結果：{statusLabel(result.status)}</h2>
          <p className="mt-2 text-sm font-semibold text-slate-700">{result.message}</p>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div><dt className="font-bold text-slate-500">來源</dt><dd className="font-black">{result.source}</dd></div>
            <div><dt className="font-bold text-slate-500">可用票區</dt><dd className="font-black">{result.availableAreaCount}</dd></div>
            <div><dt className="font-bold text-slate-500">售完票區</dt><dd className="font-black">{result.soldOutAreaCount}</dd></div>
            <div><dt className="font-bold text-slate-500">最佳命中</dt><dd className="font-black">{result.bestAvailableArea?.areaName || "無"}</dd></div>
          </dl>
          <div className="mt-3 grid gap-2">
            {result.parsedAreas.map((area, index) => (
              <div key={`${area.areaName}-${index}`} className="rounded-md border border-slate-200 p-3 text-sm">
                <p className="font-black">{area.areaName}</p>
                <p className="text-slate-600">
                  {area.price || "無票價"} · {area.statusText || "無狀態"} · {area.source}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

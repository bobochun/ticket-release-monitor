"use client";

import { useEffect } from "react";
import { AlertTriangle, Home, RefreshCw, Settings } from "lucide-react";

export default function ErrorPage({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route rendering failed", error);
  }, [error]);

  return (
    <main className="page-shell">
      <section className="surface mx-auto max-w-2xl border border-amber-200 bg-amber-50 p-6">
        <div className="flex items-center gap-2 text-amber-800">
          <AlertTriangle size={24} />
          <h1 className="text-2xl font-black">頁面暫時無法載入</h1>
        </div>
        <p className="mt-3 text-sm font-semibold leading-6 text-amber-900">
          可能是資料庫暫停、額度用盡、環境變數失效，或外部售票頁暫時無法回應。敏感的伺服器錯誤內容不會顯示在畫面上。
        </p>
        {error.digest ? <p className="mt-2 text-xs font-bold text-amber-800">Digest：{error.digest}</p> : null}
        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <button className="btn btn-primary" onClick={reset}>
            <RefreshCw size={18} /> 重新嘗試
          </button>
          <a className="btn btn-secondary" href="/">
            <Home size={18} /> 回到總覽
          </a>
          <a className="btn btn-secondary" href="/settings">
            <Settings size={18} /> 檢查設定
          </a>
        </div>
      </section>
    </main>
  );
}

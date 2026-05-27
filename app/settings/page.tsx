"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCircle2, ShieldCheck } from "lucide-react";

type SettingsState = {
  telegramConfigured: boolean;
  discordConfigured: boolean;
  cronSecretConfigured: boolean;
  checkMode: string;
  maxTargetsPerCron: number;
  maxConcurrentChecks: number;
  minCheckIntervalSeconds: number;
  defaultCheckIntervalSeconds: number;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then((response) => response.json())
      .then(setSettings)
      .catch(() => setSettings(null));
  }, []);

  async function testNotification() {
    setMessage(null);
    const response = await fetch("/api/notifications/test", { method: "POST" });
    setMessage(response.ok ? "Test notification sent or logged." : "Test notification failed.");
  }

  return (
    <main className="page-shell">
      <section className="mb-5">
        <p className="text-sm font-black uppercase tracking-normal text-teal-700">Settings</p>
        <h1 className="mt-1 text-3xl font-black tracking-normal">系統設定</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
          Secrets are read from environment variables and are never rendered in the UI.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {[
          ["Telegram configured", settings?.telegramConfigured],
          ["Discord configured", settings?.discordConfigured],
          ["Cron secret configured", settings?.cronSecretConfigured]
        ].map(([label, value]) => (
          <div className="surface p-4" key={String(label)}>
            <div className="flex items-center gap-2 text-teal-700">
              <CheckCircle2 size={20} />
              <h2 className="font-black">{label}</h2>
            </div>
            <p className="mt-2 text-2xl font-black">{value ? "Yes" : "No"}</p>
          </div>
        ))}
        <div className="surface p-4">
          <div className="flex items-center gap-2 text-teal-700">
            <Bell size={20} />
            <h2 className="font-black">Notification test</h2>
          </div>
          <button className="btn btn-primary mt-3 w-full" onClick={testNotification}>
            Send test
          </button>
          {message ? <p className="mt-2 text-sm font-bold text-slate-700">{message}</p> : null}
        </div>
      </section>

      <section className="surface mt-4 p-4">
        <h2 className="text-lg font-black">Vercel Cron</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="font-bold text-slate-500">Schedule</dt>
            <dd className="font-black">*/5 * * * *</dd>
          </div>
          <div>
            <dt className="font-bold text-slate-500">Check mode</dt>
            <dd className="font-black">{settings?.checkMode ?? "fetch"}</dd>
          </div>
          <div>
            <dt className="font-bold text-slate-500">Max per cron</dt>
            <dd className="font-black">{settings?.maxTargetsPerCron ?? 2}</dd>
          </div>
          <div>
            <dt className="font-bold text-slate-500">Min interval</dt>
            <dd className="font-black">{settings?.minCheckIntervalSeconds ?? 120}s</dd>
          </div>
        </dl>
      </section>

      <section className="surface mt-4 p-4">
        <div className="flex items-center gap-2 text-teal-800">
          <ShieldCheck size={22} />
          <h2 className="text-lg font-black">Safety policy</h2>
        </div>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
          This app monitors public ticket pages at a low frequency. It does not login, select seats,
          add to cart, checkout, pay, solve CAPTCHA, bypass queues, rotate proxies, or simulate user
          behavior to avoid platform protection.
        </p>
      </section>
    </main>
  );
}

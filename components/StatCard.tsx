import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  icon
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="surface p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-600">{label}</p>
        <div className="text-teal-700">{icon}</div>
      </div>
      <div className="mt-2 text-3xl font-black tracking-normal text-ink">{value}</div>
    </div>
  );
}

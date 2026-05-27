import type { CheckStatus } from "@/src/shared/types";
import { statusLabel } from "@/src/shared/status";

const styles: Record<CheckStatus | "ENABLED" | "DISABLED_TARGET" | "TEMPLATE", string> = {
  AVAILABLE: "bg-emerald-100 text-emerald-800 border-emerald-200",
  POSSIBLE_MATCH: "bg-blue-100 text-blue-800 border-blue-200",
  UNAVAILABLE: "bg-slate-100 text-slate-700 border-slate-200",
  BOT_CHECK: "bg-orange-100 text-orange-800 border-orange-200",
  LOGIN_REQUIRED: "bg-purple-100 text-purple-800 border-purple-200",
  QUEUE_DETECTED: "bg-yellow-100 text-yellow-900 border-yellow-200",
  ERROR: "bg-red-100 text-red-800 border-red-200",
  DISABLED: "bg-slate-100 text-slate-600 border-slate-200",
  ENABLED: "bg-teal-100 text-teal-800 border-teal-200",
  DISABLED_TARGET: "bg-slate-100 text-slate-600 border-slate-200",
  TEMPLATE: "bg-violet-100 text-violet-800 border-violet-200"
};

export function StatusBadge({ status, label }: { status: keyof typeof styles; label?: string }) {
  const displayLabel =
    label ?? (["ENABLED", "DISABLED_TARGET", "TEMPLATE"].includes(status) ? status : statusLabel(status as CheckStatus));

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${styles[status]}`}>
      {displayLabel}
    </span>
  );
}

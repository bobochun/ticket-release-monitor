import type { CheckStatus } from "./types";

export const STATUS_LABEL_ZH: Record<CheckStatus, string> = {
  AVAILABLE: "疑似有票",
  POSSIBLE_MATCH: "可能符合",
  UNAVAILABLE: "未偵測到",
  BOT_CHECK: "偵測到驗證",
  LOGIN_REQUIRED: "需要登入",
  QUEUE_DETECTED: "偵測到排隊",
  ERROR: "檢查錯誤",
  DISABLED: "未啟用"
};

export const ALERT_STATUSES: CheckStatus[] = [
  "AVAILABLE",
  "POSSIBLE_MATCH",
  "BOT_CHECK",
  "LOGIN_REQUIRED",
  "QUEUE_DETECTED",
  "ERROR"
];

export function statusLabel(status: CheckStatus): string {
  return STATUS_LABEL_ZH[status] ?? status;
}

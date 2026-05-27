import type { CheckResult, NotifyOn } from "@/src/shared/types";

export function notificationThresholdAllows(result: Pick<CheckResult, "status" | "notifyOn">): boolean {
  if (["BOT_CHECK", "QUEUE_DETECTED", "LOGIN_REQUIRED", "ERROR"].includes(result.status)) {
    return true;
  }
  const notifyOn: NotifyOn = result.notifyOn ?? "available_only";
  if (notifyOn === "all") return true;
  if (notifyOn === "available_and_possible") {
    return result.status === "AVAILABLE" || result.status === "POSSIBLE_MATCH";
  }
  return result.status === "AVAILABLE";
}

export function notificationSkipReason(result: Pick<CheckResult, "status" | "notifyOn">): string | null {
  if (notificationThresholdAllows(result)) return null;
  const notifyOn: NotifyOn = result.notifyOn ?? "available_only";
  if (result.status === "POSSIBLE_MATCH" && notifyOn === "available_only") {
    return "POSSIBLE_MATCH 未達通知門檻 available_only";
  }
  return `${result.status} 未達通知門檻 ${notifyOn}`;
}

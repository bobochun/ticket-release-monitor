export type TargetConfig = {
  name: string;
  url: string;
  enabled: boolean;
  checkIntervalSeconds: number;
  timeoutMs: number;
  keywords: string[];
  negativeKeywords: string[];
  note?: string;
};

export type AppConfig = {
  targets: TargetConfig[];
};

export type CaptchaDetectionResult = {
  detected: boolean;
  reason?: string;
};

export type TextDetectionResult = {
  matched: boolean;
  matchedKeywords: string[];
  blockedByNegativeKeywords: string[];
};

export type MonitorResultStatus =
  | "AVAILABLE"
  | "UNAVAILABLE"
  | "CAPTCHA_OR_BOT_CHECK"
  | "ERROR"
  | "DISABLED";

export type MonitorResult = {
  targetName: string;
  url: string;
  status: MonitorResultStatus;
  checkedAt: string;
  message: string;
  matchedKeywords?: string[];
  blockedByNegativeKeywords?: string[];
  error?: string;
};

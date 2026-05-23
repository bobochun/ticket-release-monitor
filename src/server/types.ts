export type Target = {
  id: number;
  name: string;
  platform: string;
  url: string;
  enabled: boolean;
  checkIntervalSeconds: number;
  timeoutMs: number;
  includeKeywords: string[];
  excludeKeywords: string[];
  areaKeywords: string[];
  areaBlacklist: string[];
  priceKeywords: string[];
  notes: string | null;
  lastCheckedAt: string | null;
  nextCheckAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CheckStatus =
  | "AVAILABLE"
  | "POSSIBLE_MATCH"
  | "UNAVAILABLE"
  | "BOT_CHECK"
  | "LOGIN_REQUIRED"
  | "QUEUE_DETECTED"
  | "ERROR"
  | "DISABLED";

export type CheckResult = {
  targetId?: number;
  targetName: string;
  url: string;
  status: CheckStatus;
  message: string;
  matchedKeywords: string[];
  matchedAreas: string[];
  matchedPrices: string[];
  botCheckDetected: boolean;
  checkedAt: string;
  durationMs: number;
  error?: string;
};

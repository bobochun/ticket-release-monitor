export type CheckStatus =
  | "AVAILABLE"
  | "POSSIBLE_MATCH"
  | "UNAVAILABLE"
  | "BOT_CHECK"
  | "LOGIN_REQUIRED"
  | "QUEUE_DETECTED"
  | "ERROR"
  | "DISABLED";

export type ParsedTicketArea = {
  areaName: string;
  price?: string;
  statusText: string;
  remainingText?: string;
  remainingCount?: number;
  isAvailable: boolean;
  isSoldOut: boolean;
  matchedAreaKeywords: string[];
  matchedPriceKeywords: string[];
  source: "table" | "list" | "text" | "svg" | "image-map" | "ocr";
};

export type ParsedAvailability = {
  eventTitle?: string;
  eventDate?: string;
  venue?: string;
  areas: ParsedTicketArea[];
  pageSignals: string[];
  hasTicketContent: boolean;
  parserId: string;
};

export type CheckSource = "auto_fetch" | "manual_parse" | "ocr_assisted";

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
  isTemplate: boolean;
  lastCheckedAt: string | null;
  nextCheckAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CheckRun = {
  id: number;
  targetId: number | null;
  targetName: string;
  url: string;
  status: CheckStatus;
  message: string;
  matchedKeywords: string[];
  matchedAreas: string[];
  matchedPrices: string[];
  parsedAreas: ParsedTicketArea[];
  eventTitle: string | null;
  eventDate: string | null;
  venue: string | null;
  bestAvailableArea: ParsedTicketArea | null;
  availableAreaCount: number;
  soldOutAreaCount: number;
  source: CheckSource;
  botCheckDetected: boolean;
  checkedAt: string;
  durationMs: number;
  error: string | null;
};

export type CheckResult = Omit<CheckRun, "id">;

export type DiscoveryRule = {
  id: number;
  name: string;
  enabled: boolean;
  platform: string;
  seedUrls: string[];
  includeKeywords: string[];
  optionalKeywords: string[];
  excludeKeywords: string[];
  dateKeywords: string[];
  venueKeywords: string[];
  teamKeywords: string[];
  seatKeywords: string[];
  maxCandidates: number;
  createdAt: string;
  updatedAt: string;
};

export type DiscoveredCandidate = {
  id: number;
  ruleId: number | null;
  title: string;
  url: string;
  platform: string;
  score: number;
  matchedKeywords: string[];
  sourceUrl: string;
  discoveredAt: string;
  addedToTargets: boolean;
};

export type NotificationEvent = {
  id: number;
  type: string;
  channel: string;
  status: string;
  title: string;
  body: string;
  url: string | null;
  createdAt: string;
  error: string | null;
};

export type TargetInput = {
  name: string;
  platform?: string;
  url: string;
  enabled?: boolean;
  checkIntervalSeconds?: number;
  timeoutMs?: number;
  includeKeywords?: string[];
  excludeKeywords?: string[];
  areaKeywords?: string[];
  areaBlacklist?: string[];
  priceKeywords?: string[];
  notes?: string | null;
  isTemplate?: boolean;
};

export type DiscoveryRuleInput = {
  name: string;
  enabled?: boolean;
  platform?: string;
  seedUrls?: string[];
  includeKeywords?: string[];
  optionalKeywords?: string[];
  excludeKeywords?: string[];
  dateKeywords?: string[];
  venueKeywords?: string[];
  teamKeywords?: string[];
  seatKeywords?: string[];
  maxCandidates?: number;
};

export type SchedulerSummary = {
  ok: boolean;
  message?: string;
  trigger?: "vercel-cron" | "external-scheduler" | "manual";
  checked: number;
  skipped: number;
  dueTargets: number;
  maxTargetsPerCron: number;
  results: CheckResult[];
  skippedTargets?: Array<{
    id: number;
    name: string;
    url: string;
    reason: string;
  }>;
  timestamp: string;
};

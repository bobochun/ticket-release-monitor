export type SchedulerProfile = "eco" | "balanced" | "burst" | "custom";
export type SchedulerTrigger = "vercel-cron" | "external-scheduler" | "manual";
export type SchedulerGateReason =
  | "allowed"
  | "manual_bypass"
  | "scheduler_disabled"
  | "quiet_hours"
  | "minute_bucket";

export type SchedulerGateStatus = {
  allowed: boolean;
  reason: SchedulerGateReason;
  profile: SchedulerProfile;
  timeZone: string;
  localTime: string;
  localMinute: number;
  allowedMinutes: number[] | null;
  quietHoursEnabled: boolean;
  skipQuietHours: boolean;
};

export function getEnvNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  const value = raw ? Number(raw) : Number.NaN;
  return Number.isFinite(value) ? value : fallback;
}

export function getEnvBoolean(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  return raw.toLowerCase() === "true" || raw === "1" || raw.toLowerCase() === "yes";
}

function isVercelRuntime(): boolean {
  return process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV);
}

function validPostgresUrl(value: string | undefined): boolean {
  return Boolean(value?.startsWith("postgres://") || value?.startsWith("postgresql://"));
}

function schedulerProfile(): SchedulerProfile {
  const raw = (process.env.SCHEDULER_PROFILE || (isVercelRuntime() ? "balanced" : "burst")).toLowerCase();
  return raw === "eco" || raw === "balanced" || raw === "burst" || raw === "custom"
    ? raw
    : "balanced";
}

function parseAllowedMinutes(value: string | undefined): number[] {
  if (!value) return [];
  return [...new Set(
    value
      .split(",")
      .map((item) => Number(item.trim()))
      .filter((minute) => Number.isInteger(minute) && minute >= 0 && minute <= 59)
  )].sort((a, b) => a - b);
}

function allowedMinutesForProfile(profile: SchedulerProfile): number[] | null {
  if (profile === "burst") return null;
  if (profile === "eco") return [0];
  if (profile === "balanced") return [0, 30];

  const custom = parseAllowedMinutes(process.env.SCHEDULER_ALLOWED_MINUTES);
  return custom.length > 0 ? custom : [0, 30];
}

function timeParts(date: Date, timeZone: string): { hour: number; minute: number; localTime: string } {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
  const parts = formatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  return {
    hour: Number.isFinite(hour) ? hour : 0,
    minute: Number.isFinite(minute) ? minute : 0,
    localTime: `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`
  };
}

function clockMinutes(value: string, fallback: string): number {
  const [hour, minute] = (value || fallback).split(":").map(Number);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    const [fallbackHour, fallbackMinute] = fallback.split(":").map(Number);
    return fallbackHour * 60 + fallbackMinute;
  }
  return hour * 60 + minute;
}

export function isQuietHoursAt(date = new Date()): boolean {
  if (!getEnvBoolean("QUIET_HOURS_ENABLED", false)) return false;
  const timeZone = process.env.QUIET_HOURS_TIMEZONE || "Asia/Taipei";
  const { hour, minute } = timeParts(date, timeZone);
  const now = hour * 60 + minute;
  const start = clockMinutes(process.env.QUIET_HOURS_START || "23:30", "23:30");
  const end = clockMinutes(process.env.QUIET_HOURS_END || "07:30", "07:30");
  return start <= end ? now >= start && now < end : now >= start || now < end;
}

export function getSchedulerGateStatus(
  trigger: SchedulerTrigger = "external-scheduler",
  date = new Date()
): SchedulerGateStatus {
  const profile = schedulerProfile();
  const timeZone = process.env.QUIET_HOURS_TIMEZONE || "Asia/Taipei";
  const { minute, localTime } = timeParts(date, timeZone);
  const allowedMinutes = allowedMinutesForProfile(profile);
  const quietHoursEnabled = getEnvBoolean("QUIET_HOURS_ENABLED", false);
  const skipQuietHours = getEnvBoolean("SCHEDULER_SKIP_QUIET_HOURS", true);
  const manualBypass = getEnvBoolean("MANUAL_CHECK_BYPASS_SCHEDULER_GATE", true);

  const base = {
    profile,
    timeZone,
    localTime,
    localMinute: minute,
    allowedMinutes,
    quietHoursEnabled,
    skipQuietHours
  };

  if (trigger === "manual" && manualBypass) {
    return { ...base, allowed: true, reason: "manual_bypass" };
  }

  if (!getEnvBoolean("SCHEDULER_ENABLED", true)) {
    return { ...base, allowed: false, reason: "scheduler_disabled" };
  }

  if (skipQuietHours && quietHoursEnabled && isQuietHoursAt(date)) {
    return { ...base, allowed: false, reason: "quiet_hours" };
  }

  if (allowedMinutes && !allowedMinutes.includes(minute)) {
    return { ...base, allowed: false, reason: "minute_bucket" };
  }

  return { ...base, allowed: true, reason: "allowed" };
}

export function minCheckIntervalSeconds(): number {
  return getEnvNumber("MIN_CHECK_INTERVAL_SECONDS", 900);
}

export function defaultCheckIntervalSeconds(): number {
  return Math.max(
    getEnvNumber("DEFAULT_CHECK_INTERVAL_SECONDS", 1800),
    minCheckIntervalSeconds()
  );
}

export function normalizeCheckInterval(value: number | undefined): number {
  return Math.max(value ?? defaultCheckIntervalSeconds(), minCheckIntervalSeconds());
}

export function getConfiguredStatus() {
  const cronSecret = process.env.CRON_SECRET || "";
  const postgresUrlConfigured = validPostgresUrl(process.env.POSTGRES_URL);
  const databaseUrlConfigured = validPostgresUrl(process.env.DATABASE_URL);
  const gate = getSchedulerGateStatus("external-scheduler");
  const profile = gate.profile;
  const defaultExternalInterval = profile === "eco" ? 60 : profile === "balanced" ? 30 : 5;

  return {
    telegramConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    discordConfigured: Boolean(process.env.DISCORD_WEBHOOK_URL),
    cronSecretConfigured: Boolean(cronSecret),
    cronSecretMasked: maskSecret(cronSecret),
    databaseConfigured: postgresUrlConfigured || databaseUrlConfigured,
    databaseVariable: postgresUrlConfigured ? "POSTGRES_URL" : databaseUrlConfigured ? "DATABASE_URL" : "missing",
    autoDbMigrate: getEnvBoolean("AUTO_DB_MIGRATE", !isVercelRuntime()),
    dbMaxConnections: getEnvNumber("DB_MAX_CONNECTIONS", 1),
    checkMode: process.env.CHECK_MODE || "fetch",
    maxTargetsPerCron: getEnvNumber("MAX_TARGETS_PER_CRON", 1),
    maxConcurrentChecks: getEnvNumber("MAX_CONCURRENT_CHECKS", 1),
    minCheckIntervalSeconds: minCheckIntervalSeconds(),
    defaultCheckIntervalSeconds: defaultCheckIntervalSeconds(),
    notificationDedupeMinutes: getEnvNumber("NOTIFICATION_DEDUPE_MINUTES", 60),
    errorDedupeMinutes: getEnvNumber("ERROR_DEDUPE_MINUTES", 60),
    quietHoursEnabled: getEnvBoolean("QUIET_HOURS_ENABLED", false),
    quietHoursStart: process.env.QUIET_HOURS_START || "23:30",
    quietHoursEnd: process.env.QUIET_HOURS_END || "07:30",
    quietHoursTimezone: process.env.QUIET_HOURS_TIMEZONE || "Asia/Taipei",
    schedulerEnabled: getEnvBoolean("SCHEDULER_ENABLED", true),
    schedulerProfile: profile,
    schedulerAllowedMinutes: gate.allowedMinutes,
    schedulerAllowedNow: gate.allowed,
    schedulerGateReason: gate.reason,
    schedulerSkipQuietHours: gate.skipQuietHours,
    externalSchedulerIntervalMinutes: getEnvNumber("EXTERNAL_SCHEDULER_INTERVAL_MINUTES", defaultExternalInterval),
    manualCheckBypassSchedulerGate: getEnvBoolean("MANUAL_CHECK_BYPASS_SCHEDULER_GATE", true),
    allowCronSecretQuery: getEnvBoolean("ALLOW_CRON_SECRET_QUERY", true),
    ocrEnabled: getEnvBoolean("OCR_ENABLED", false),
    ocrMode: process.env.OCR_MODE || "tesseract",
    ocrLang: process.env.OCR_LANG || "eng+chi_tra",
    ocrMaxImagesPerCheck: getEnvNumber("OCR_MAX_IMAGES_PER_CHECK", 1),
    ocrMaxImageBytes: getEnvNumber("OCR_MAX_IMAGE_BYTES", 800000),
    ocrTimeoutMs: getEnvNumber("OCR_TIMEOUT_MS", 12000),
    ocrAllowCrossOrigin: getEnvBoolean("OCR_ALLOW_CROSS_ORIGIN", true),
    cronEndpointHint: "/api/cron/check",
    cronAuthorizationHint: "Authorization: Bearer ****"
  };
}

export function maskSecret(secret: string): string {
  if (!secret) return "";
  if (secret.length <= 8) return "****";
  return `${secret.slice(0, Math.min(14, secret.length - 4))}****`;
}

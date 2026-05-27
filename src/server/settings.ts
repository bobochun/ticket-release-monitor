export function getEnvNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  const value = raw ? Number(raw) : Number.NaN;
  return Number.isFinite(value) ? value : fallback;
}

export function minCheckIntervalSeconds(): number {
  return getEnvNumber("MIN_CHECK_INTERVAL_SECONDS", 120);
}

export function defaultCheckIntervalSeconds(): number {
  return Math.max(
    getEnvNumber("DEFAULT_CHECK_INTERVAL_SECONDS", 180),
    minCheckIntervalSeconds()
  );
}

export function normalizeCheckInterval(value: number | undefined): number {
  return Math.max(value ?? defaultCheckIntervalSeconds(), minCheckIntervalSeconds());
}

export function getConfiguredStatus() {
  const cronSecret = process.env.CRON_SECRET || "";
  return {
    telegramConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    discordConfigured: Boolean(process.env.DISCORD_WEBHOOK_URL),
    cronSecretConfigured: Boolean(cronSecret),
    cronSecretMasked: maskSecret(cronSecret),
    checkMode: process.env.CHECK_MODE || "fetch",
    maxTargetsPerCron: getEnvNumber("MAX_TARGETS_PER_CRON", 2),
    maxConcurrentChecks: getEnvNumber("MAX_CONCURRENT_CHECKS", 1),
    minCheckIntervalSeconds: minCheckIntervalSeconds(),
    defaultCheckIntervalSeconds: defaultCheckIntervalSeconds(),
    notificationDedupeMinutes: getEnvNumber("NOTIFICATION_DEDUPE_MINUTES", 30),
    errorDedupeMinutes: getEnvNumber("ERROR_DEDUPE_MINUTES", 15),
    quietHoursEnabled: (process.env.QUIET_HOURS_ENABLED || "false") === "true",
    quietHoursStart: process.env.QUIET_HOURS_START || "23:30",
    quietHoursEnd: process.env.QUIET_HOURS_END || "07:30",
    quietHoursTimezone: process.env.QUIET_HOURS_TIMEZONE || "Asia/Taipei",
    ocrEnabled: (process.env.OCR_ENABLED || "false") === "true",
    ocrMode: process.env.OCR_MODE || "tesseract",
    ocrLang: process.env.OCR_LANG || "eng+chi_tra",
    ocrMaxImagesPerCheck: getEnvNumber("OCR_MAX_IMAGES_PER_CHECK", 1),
    ocrMaxImageBytes: getEnvNumber("OCR_MAX_IMAGE_BYTES", 800000),
    ocrTimeoutMs: getEnvNumber("OCR_TIMEOUT_MS", 12000),
    ocrAllowCrossOrigin: (process.env.OCR_ALLOW_CROSS_ORIGIN || "true") === "true",
    cronEndpointHint: "/api/cron/check?secret=****"
  };
}

export function maskSecret(secret: string): string {
  if (!secret) return "";
  if (secret.length <= 8) return "****";
  return `${secret.slice(0, Math.min(14, secret.length - 4))}****`;
}

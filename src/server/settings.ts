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
  return {
    telegramConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    discordConfigured: Boolean(process.env.DISCORD_WEBHOOK_URL),
    cronSecretConfigured: Boolean(process.env.CRON_SECRET),
    checkMode: process.env.CHECK_MODE || "fetch",
    maxTargetsPerCron: getEnvNumber("MAX_TARGETS_PER_CRON", 2),
    maxConcurrentChecks: getEnvNumber("MAX_CONCURRENT_CHECKS", 1),
    minCheckIntervalSeconds: minCheckIntervalSeconds(),
    defaultCheckIntervalSeconds: defaultCheckIntervalSeconds()
  };
}

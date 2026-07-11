export type PublicErrorInfo = {
  code: "DB_NOT_CONFIGURED" | "DB_UNAVAILABLE" | "INTERNAL_ERROR";
  message: string;
  status: number;
};

export function publicErrorInfo(error: unknown): PublicErrorInfo {
  const raw = error instanceof Error ? error.message : String(error);
  const message = raw.toLowerCase();

  if (message.includes("database is not configured for vercel")) {
    return {
      code: "DB_NOT_CONFIGURED",
      message: "Production 尚未設定可用的 PostgreSQL 連線。請檢查 POSTGRES_URL 或 DATABASE_URL，完成後重新部署。",
      status: 503
    };
  }

  if (
    message.includes("connect") ||
    message.includes("timeout") ||
    message.includes("econn") ||
    message.includes("enotfound") ||
    message.includes("postgres") ||
    message.includes("database") ||
    message.includes("neon") ||
    message.includes("ssl")
  ) {
    return {
      code: "DB_UNAVAILABLE",
      message: "資料庫目前無法連線，可能是服務暫停、額度用盡、連線字串失效或網路暫時異常。",
      status: 503
    };
  }

  return {
    code: "INTERNAL_ERROR",
    message: "伺服器暫時無法完成這項操作，請稍後再試並查看 Vercel runtime logs。",
    status: 500
  };
}

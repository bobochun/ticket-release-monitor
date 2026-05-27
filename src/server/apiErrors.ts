import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400
  ) {
    super(message);
  }
}

export function errorPayload(error: unknown) {
  if (error instanceof AppError) {
    return { ok: false, error: error.message, code: error.code };
  }

  if (error instanceof ZodError) {
    return { ok: false, error: "輸入資料格式不正確，請檢查欄位。", code: "INVALID_INPUT" };
  }

  return {
    ok: false,
    error: error instanceof Error ? error.message : "系統發生未預期錯誤。",
    code: "INTERNAL_ERROR"
  };
}

export function errorResponse(error: unknown, fallbackStatus = 400) {
  const status = error instanceof AppError ? error.status : fallbackStatus;
  return NextResponse.json(errorPayload(error), { status });
}

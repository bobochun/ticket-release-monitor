import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { z } from "zod";
import type { AppConfig } from "./types.js";

const targetSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  enabled: z.boolean().default(true),
  checkIntervalSeconds: z.number().int().min(60).default(180),
  timeoutMs: z.number().int().min(5000).max(120000).default(30000),
  keywords: z.array(z.string().min(1)).min(1),
  negativeKeywords: z.array(z.string().min(1)).default([]),
  note: z.string().optional()
});

const appConfigSchema = z.object({
  targets: z.array(targetSchema).default([])
});

export function loadConfig(configPath = "config/targets.yml"): AppConfig {
  const absolutePath = path.resolve(process.cwd(), configPath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error([
      `Config file not found: ${absolutePath}`,
      `Create it from config/targets.example.yml:`,
      `cp config/targets.example.yml config/targets.yml`
    ].join("\n"));
  }

  const raw = fs.readFileSync(absolutePath, "utf8");
  const parsed = yaml.load(raw);
  const result = appConfigSchema.safeParse(parsed);

  if (!result.success) {
    throw new Error(`Invalid config:\n${result.error.message}`);
  }

  return result.data;
}

export function getEnvNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

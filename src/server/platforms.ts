import { PLATFORM_DEFAULTS, getPlatformDefault } from "@/src/shared/platformDefaults";

export type PlatformInfo = (typeof PLATFORM_DEFAULTS)[number];

export const PLATFORMS = PLATFORM_DEFAULTS;

export function platformLabel(id: string): string {
  return getPlatformDefault(id).labelZh ?? id;
}

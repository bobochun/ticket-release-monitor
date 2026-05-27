import { parseWithPlatform } from "./genericAvailabilityParser";
import type { AvailabilityParser } from "./types";

export const khamParser: AvailabilityParser = (input) => parseWithPlatform(input, "kham");

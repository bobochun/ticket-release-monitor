import { parseWithPlatform } from "./genericAvailabilityParser";
import type { AvailabilityParser } from "./types";

export const indievoxParser: AvailabilityParser = (input) => parseWithPlatform(input, "indievox");

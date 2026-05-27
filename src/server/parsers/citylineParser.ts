import { parseWithPlatform } from "./genericAvailabilityParser";
import type { AvailabilityParser } from "./types";

export const citylineParser: AvailabilityParser = (input) => parseWithPlatform(input, "cityline");

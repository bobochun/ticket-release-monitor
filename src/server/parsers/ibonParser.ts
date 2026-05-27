import { parseWithPlatform } from "./genericAvailabilityParser";
import type { AvailabilityParser } from "./types";

export const ibonParser: AvailabilityParser = (input) => parseWithPlatform(input, "ibon");

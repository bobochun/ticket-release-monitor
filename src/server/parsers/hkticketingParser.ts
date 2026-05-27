import { parseWithPlatform } from "./genericAvailabilityParser";
import type { AvailabilityParser } from "./types";

export const hkticketingParser: AvailabilityParser = (input) => parseWithPlatform(input, "hkticketing");

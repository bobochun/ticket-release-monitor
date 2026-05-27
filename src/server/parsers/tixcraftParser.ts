import { parseWithPlatform } from "./genericAvailabilityParser";
import type { AvailabilityParser } from "./types";

export const tixcraftParser: AvailabilityParser = (input) => parseWithPlatform(input, "tixcraft");

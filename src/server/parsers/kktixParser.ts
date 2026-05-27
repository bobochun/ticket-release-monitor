import { parseWithPlatform } from "./genericAvailabilityParser";
import type { AvailabilityParser } from "./types";

export const kktixParser: AvailabilityParser = (input) => parseWithPlatform(input, "kktix");

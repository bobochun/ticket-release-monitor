import { parseWithPlatform } from "./genericAvailabilityParser";
import type { AvailabilityParser } from "./types";

export const famiticketParser: AvailabilityParser = (input) => parseWithPlatform(input, "famiticket");

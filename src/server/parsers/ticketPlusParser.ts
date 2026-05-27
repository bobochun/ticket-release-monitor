import { parseWithPlatform } from "./genericAvailabilityParser";
import type { AvailabilityParser } from "./types";

export const ticketPlusParser: AvailabilityParser = (input) => parseWithPlatform(input, "ticketplus");

import { parseWithPlatform } from "./genericAvailabilityParser";
import type { AvailabilityParser } from "./types";

export const eraTicketParser: AvailabilityParser = (input) => parseWithPlatform(input, "era_ticket");

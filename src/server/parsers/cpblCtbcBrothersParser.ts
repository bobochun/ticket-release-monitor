import { parseWithPlatform } from "./genericAvailabilityParser";
import type { AvailabilityParser } from "./types";

export const cpblCtbcBrothersParser: AvailabilityParser = (input) =>
  parseWithPlatform(input, "cpbl_ctbc_brothers");

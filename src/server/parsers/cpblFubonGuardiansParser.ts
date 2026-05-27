import { parseWithPlatform } from "./genericAvailabilityParser";
import type { AvailabilityParser } from "./types";

export const cpblFubonGuardiansParser: AvailabilityParser = (input) =>
  parseWithPlatform(input, "cpbl_fubon_guardians");

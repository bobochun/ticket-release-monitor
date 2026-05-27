import { genericAvailabilityParser, parseWithPlatform } from "./genericAvailabilityParser";
import { cpblCtbcBrothersParser } from "./cpblCtbcBrothersParser";
import { cpblFubonGuardiansParser } from "./cpblFubonGuardiansParser";
import { famiticketParser } from "./famiticketParser";
import { ibonParser } from "./ibonParser";
import { tixcraftParser } from "./tixcraftParser";
import { kktixParser } from "./kktixParser";
import { ticketPlusParser } from "./ticketPlusParser";
import { eraTicketParser } from "./eraTicketParser";
import { khamParser } from "./khamParser";
import { citylineParser } from "./citylineParser";
import { hkticketingParser } from "./hkticketingParser";
import { indievoxParser } from "./indievoxParser";
import type { AvailabilityParser } from "./types";

const parserMap: Record<string, AvailabilityParser> = {
  generic: genericAvailabilityParser,
  cpbl_ctbc_brothers: cpblCtbcBrothersParser,
  cpbl_fubon_guardians: cpblFubonGuardiansParser,
  ibon: ibonParser,
  famiticket: famiticketParser,
  tixcraft: tixcraftParser,
  kktix: kktixParser,
  ticketplus: ticketPlusParser,
  era_ticket: eraTicketParser,
  kham: khamParser,
  cityline: citylineParser,
  hkticketing: hkticketingParser,
  indievox: indievoxParser,
  ticketmaster: (input) => parseWithPlatform(input, "ticketmaster"),
  teamear: (input) => parseWithPlatform(input, "teamear"),
  fansi_go: (input) => parseWithPlatform(input, "fansi_go"),
  funone: (input) => parseWithPlatform(input, "funone"),
  cpbl_unilions: (input) => parseWithPlatform(input, "cpbl_unilions"),
  cpbl_rakuten_monkeys: (input) => parseWithPlatform(input, "cpbl_rakuten_monkeys"),
  cpbl_weichuan_dragons: (input) => parseWithPlatform(input, "cpbl_weichuan_dragons"),
  cpbl_tsg_hawks: (input) => parseWithPlatform(input, "cpbl_tsg_hawks")
};

export function getParserForPlatform(platformId: string): AvailabilityParser {
  return parserMap[platformId] ?? genericAvailabilityParser;
}

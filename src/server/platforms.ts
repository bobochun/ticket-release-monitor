export type PlatformInfo = {
  id: string;
  label: string;
  hosts: string[];
  category: "generic" | "concert" | "sports" | "ticketing";
  notes: string;
};

export const PLATFORMS: PlatformInfo[] = [
  { id: "generic", label: "Generic", hosts: [], category: "generic", notes: "Generic public page detector." },
  { id: "tixcraft", label: "TixCraft / 拓元", hosts: ["tixcraft.com"], category: "concert", notes: "MVP uses generic detector only." },
  { id: "teamear", label: "Teamear", hosts: ["teamear.example.com"], category: "ticketing", notes: "Template platform." },
  { id: "ticketmaster", label: "Ticketmaster", hosts: ["ticketmaster.com"], category: "concert", notes: "Public page monitoring only." },
  { id: "indievox", label: "Indievox", hosts: ["indievox.com"], category: "concert", notes: "Public event page monitoring." },
  { id: "kktix", label: "KKTIX", hosts: ["kktix.com"], category: "concert", notes: "No login or checkout automation." },
  { id: "ticketplus", label: "TicketPlus / 遠大售票", hosts: ["ticketplus.com.tw"], category: "concert", notes: "Generic detector." },
  { id: "ibon", label: "iBon", hosts: ["orders.ibon.com.tw"], category: "ticketing", notes: "Verification stops the check." },
  { id: "era_ticket", label: "年代售票", hosts: ["ticket.com.tw"], category: "concert", notes: "Generic detector." },
  { id: "kham", label: "寬宏售票 / KHAM", hosts: ["kham.com.tw"], category: "concert", notes: "Generic detector." },
  { id: "cityline", label: "Cityline 買飛", hosts: ["cityline.com"], category: "concert", notes: "Generic detector." },
  { id: "hkticketing", label: "HKTicketing 快達票", hosts: ["hkticketing.com"], category: "concert", notes: "Generic detector." },
  { id: "famiticket", label: "FamiTicket / FamiLife", hosts: ["famiticket.com.tw", "fami.life"], category: "ticketing", notes: "Generic detector." },
  { id: "fansi_go", label: "FANSI GO", hosts: ["fansi.example.com"], category: "concert", notes: "Template platform." },
  { id: "funone", label: "FunOne", hosts: ["funone.example.com"], category: "concert", notes: "Template platform." },
  { id: "cpbl_fubon_guardians", label: "CPBL 富邦悍將", hosts: ["guardians.fami.life"], category: "sports", notes: "Generic detector." },
  { id: "cpbl_ctbc_brothers", label: "CPBL 中信兄弟", hosts: ["tix.ctbcsports.com"], category: "sports", notes: "Generic detector." },
  { id: "cpbl_unilions", label: "CPBL 統一獅", hosts: [], category: "sports", notes: "Template platform." },
  { id: "cpbl_rakuten_monkeys", label: "CPBL 樂天桃猿", hosts: [], category: "sports", notes: "Template platform." },
  { id: "cpbl_weichuan_dragons", label: "CPBL 味全龍", hosts: [], category: "sports", notes: "Template platform." },
  { id: "cpbl_tsg_hawks", label: "CPBL 台鋼雄鷹", hosts: [], category: "sports", notes: "Template platform." }
];

export function platformLabel(id: string): string {
  return PLATFORMS.find((platform) => platform.id === id)?.label ?? id;
}

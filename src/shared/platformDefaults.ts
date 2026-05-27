export type PlatformCategory = "通用" | "職棒" | "演唱會" | "售票平台";

export type PlatformDefault = {
  id: string;
  labelZh: string;
  labelEn: string;
  category: PlatformCategory;
  hosts: string[];
  defaultUrlPlaceholder: string;
  includeKeywords: string[];
  excludeKeywords: string[];
  areaKeywords: string[];
  areaBlacklist: string[];
  priceKeywords: string[];
  notes: string;
  warning: string;
};

export type QuickTemplate = {
  id: string;
  name: string;
  platform: string;
  url: string;
  description: string;
};

export const CPBL_INCLUDE = [
  "立即購票",
  "我要購票",
  "可購買",
  "可售",
  "剩餘",
  "剩餘座位",
  "餘票",
  "尚有座位",
  "熱區",
  "空位",
  "加入購物車"
];
export const CPBL_EXCLUDE = [
  "已售完",
  "售完",
  "暫無票券",
  "尚未開賣",
  "截止販售",
  "銷售一空",
  "已截止",
  "剩餘 0",
  "剩餘0",
  "0 張",
  "0張",
  "無剩餘"
];
export const CPBL_AREAS = ["熱區", "A1", "A2", "B1", "B2"];
export const DEFAULT_AREA_BLACKLIST = ["身障", "視線不良"];

export const EVENT_INCLUDE = [
  "立即購票",
  "立即訂購",
  "立即報名",
  "Buy",
  "Buy Tickets",
  "Register",
  "Available",
  "Tickets Available",
  "可購買",
  "可訂購",
  "可售",
  "剩餘",
  "剩餘票券",
  "餘票",
  "尚有票券",
  "空位",
  "選擇票區",
  "下一步",
  "加入購物車"
];

export const EVENT_EXCLUDE = [
  "已售完",
  "售完",
  "Sold Out",
  "暫無票券",
  "尚未開賣",
  "尚未啟售",
  "活動已結束",
  "截止販售",
  "已截止",
  "銷售一空",
  "Not Available",
  "Unavailable",
  "No tickets available",
  "剩餘 0",
  "剩餘0",
  "0 張",
  "0張",
  "無剩餘"
];

const generic: Omit<PlatformDefault, "id" | "labelZh" | "labelEn" | "category" | "hosts" | "defaultUrlPlaceholder"> = {
  includeKeywords: EVENT_INCLUDE,
  excludeKeywords: EVENT_EXCLUDE,
  areaKeywords: [],
  areaBlacklist: DEFAULT_AREA_BLACKLIST,
  priceKeywords: [],
  notes: "請貼上實際官方售票頁網址。系統只通知，不自動登入、不選位、不購買。",
  warning: "平台預設只會帶入關鍵字，真正監控仍需使用實際活動頁 URL。"
};

const cpbl: Omit<PlatformDefault, "id" | "labelZh" | "labelEn" | "category" | "hosts" | "defaultUrlPlaceholder"> = {
  includeKeywords: CPBL_INCLUDE,
  excludeKeywords: CPBL_EXCLUDE,
  areaKeywords: CPBL_AREAS,
  areaBlacklist: DEFAULT_AREA_BLACKLIST,
  priceKeywords: [],
  notes: "CPBL 熱區監控模板。請換成實際場次 URL 後再啟用；只通知，不自動購買。",
  warning: "不要啟用 placeholder URL。遇到驗證、排隊或登入需求時，只會通知人工處理。"
};

function eventPlatform(
  id: string,
  labelZh: string,
  labelEn: string,
  defaultUrlPlaceholder: string,
  hosts: string[] = []
): PlatformDefault {
  return {
    id,
    labelZh,
    labelEn,
    category: "演唱會",
    hosts,
    defaultUrlPlaceholder,
    ...generic
  };
}

function cpblPlatform(
  id: string,
  labelZh: string,
  labelEn: string,
  defaultUrlPlaceholder: string,
  hosts: string[] = []
): PlatformDefault {
  return {
    id,
    labelZh,
    labelEn,
    category: "職棒",
    hosts,
    defaultUrlPlaceholder,
    ...cpbl
  };
}

export const PLATFORM_DEFAULTS: PlatformDefault[] = [
  {
    id: "generic",
    labelZh: "通用公開頁面",
    labelEn: "Generic",
    category: "通用",
    hosts: [],
    defaultUrlPlaceholder: "https://example.com/YOUR_EVENT_URL",
    ...generic
  },
  eventPlatform("tixcraft", "TixCraft / 拓元", "TixCraft", "https://tixcraft.com/activity/detail/YOUR_EVENT_ID", ["tixcraft.com"]),
  eventPlatform("teamear", "Teamear", "Teamear", "https://teamear.example.com/YOUR_EVENT_URL", ["teamear.example.com"]),
  eventPlatform("ticketmaster", "Ticketmaster", "Ticketmaster", "https://www.ticketmaster.com/YOUR_EVENT_URL", ["ticketmaster.com"]),
  eventPlatform("indievox", "Indievox", "Indievox", "https://www.indievox.com/activity/detail/YOUR_EVENT_ID", ["indievox.com"]),
  eventPlatform("kktix", "KKTIX", "KKTIX", "https://kktix.com/events/YOUR_EVENT_ID", ["kktix.com"]),
  eventPlatform("ticketplus", "TicketPlus / 遠大售票", "TicketPlus", "https://ticketplus.com.tw/activity/YOUR_EVENT_ID", ["ticketplus.com.tw"]),
  eventPlatform("ibon", "iBon 售票", "iBon", "https://orders.ibon.com.tw/application/UTK02/YOUR_EVENT_URL", ["orders.ibon.com.tw"]),
  eventPlatform("era_ticket", "年代售票", "ERA Ticket", "https://ticket.com.tw/application/UTK01/YOUR_EVENT_URL", ["ticket.com.tw"]),
  eventPlatform("kham", "寬宏 KHAM", "KHAM", "https://kham.com.tw/application/UTK02/YOUR_EVENT_URL", ["kham.com.tw"]),
  eventPlatform("cityline", "Cityline 買飛", "Cityline", "https://www.cityline.com/Events.html", ["cityline.com"]),
  eventPlatform("hkticketing", "HKTicketing 快達票", "HKTicketing", "https://www.hkticketing.com/events/YOUR_EVENT_ID", ["hkticketing.com"]),
  eventPlatform("famiticket", "FamiTicket / FamiLife", "FamiTicket", "https://www.famiticket.com.tw/YOUR_EVENT_URL", ["famiticket.com.tw", "fami.life"]),
  eventPlatform("fansi_go", "FANSI GO", "FANSI GO", "https://fansi.example.com/YOUR_EVENT_URL", ["fansi.example.com"]),
  eventPlatform("funone", "FunOne", "FunOne", "https://funone.example.com/YOUR_EVENT_URL", ["funone.example.com"]),
  cpblPlatform("cpbl_fubon_guardians", "CPBL 富邦悍將", "Fubon Guardians", "https://guardians.fami.life/YOUR_EVENT_URL", ["guardians.fami.life"]),
  cpblPlatform("cpbl_ctbc_brothers", "CPBL 中信兄弟", "CTBC Brothers", "https://tix.ctbcsports.com/BROTHERS/YOUR_EVENT_URL", ["tix.ctbcsports.com"]),
  cpblPlatform("cpbl_unilions", "CPBL 統一獅", "Uni-Lions", "https://tix.example.com/unilions/YOUR_EVENT_URL"),
  cpblPlatform("cpbl_rakuten_monkeys", "CPBL 樂天桃猿", "Rakuten Monkeys", "https://tix.example.com/rakuten-monkeys/YOUR_EVENT_URL"),
  cpblPlatform("cpbl_weichuan_dragons", "CPBL 味全龍", "Wei Chuan Dragons", "https://tix.example.com/weichuan-dragons/YOUR_EVENT_URL"),
  cpblPlatform("cpbl_tsg_hawks", "CPBL 台鋼雄鷹", "TSG Hawks", "https://tix.example.com/tsg-hawks/YOUR_EVENT_URL")
];

export const QUICK_TEMPLATES: QuickTemplate[] = [
  {
    id: "ctbc-hot-zone",
    name: "中信兄弟熱區模板",
    platform: "cpbl_ctbc_brothers",
    url: "https://tix.ctbcsports.com/BROTHERS/YOUR_EVENT_URL",
    description: "中信兄弟 CPBL 熱區關鍵字"
  },
  {
    id: "fubon-hot-zone",
    name: "富邦悍將熱區模板",
    platform: "cpbl_fubon_guardians",
    url: "https://guardians.fami.life/YOUR_EVENT_URL",
    description: "富邦悍將 CPBL 熱區關鍵字"
  },
  {
    id: "tixcraft-concert",
    name: "TixCraft / 拓元演唱會模板",
    platform: "tixcraft",
    url: "https://tixcraft.com/activity/detail/YOUR_EVENT_ID",
    description: "拓元活動頁常見有票文字"
  },
  {
    id: "kktix-event",
    name: "KKTIX 活動模板",
    platform: "kktix",
    url: "https://kktix.com/events/YOUR_EVENT_ID",
    description: "KKTIX 活動頁常見有票文字"
  },
  {
    id: "ibon-ticket",
    name: "iBon 售票模板",
    platform: "ibon",
    url: "https://orders.ibon.com.tw/application/UTK02/YOUR_EVENT_URL",
    description: "iBon 售票頁關鍵字"
  },
  {
    id: "ticketplus-event",
    name: "TicketPlus 遠大售票模板",
    platform: "ticketplus",
    url: "https://ticketplus.com.tw/activity/YOUR_EVENT_ID",
    description: "TicketPlus 活動頁關鍵字"
  },
  {
    id: "era-ticket",
    name: "年代售票模板",
    platform: "era_ticket",
    url: "https://ticket.com.tw/application/UTK01/YOUR_EVENT_URL",
    description: "年代售票活動頁關鍵字"
  },
  {
    id: "kham-ticket",
    name: "寬宏 KHAM 模板",
    platform: "kham",
    url: "https://kham.com.tw/application/UTK02/YOUR_EVENT_URL",
    description: "寬宏售票活動頁關鍵字"
  },
  {
    id: "famiticket",
    name: "FamiTicket 模板",
    platform: "famiticket",
    url: "https://www.famiticket.com.tw/YOUR_EVENT_URL",
    description: "FamiTicket / FamiLife 活動頁關鍵字"
  }
];

export function getPlatformDefault(platformId: string): PlatformDefault {
  return PLATFORM_DEFAULTS.find((platform) => platform.id === platformId) ?? PLATFORM_DEFAULTS[0];
}

export function isPlaceholderUrl(url: string): boolean {
  const normalized = url.toLowerCase();
  return (
    normalized.includes("your_event_url") ||
    normalized.includes("your_event_id") ||
    normalized.includes("example.com")
  );
}

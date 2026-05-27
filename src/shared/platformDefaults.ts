export type PlatformCategory = "generic" | "cpbl" | "concert" | "sports" | "hk";

export type PlatformDefault = {
  id: string;
  labelZh: string;
  labelEn?: string;
  category: PlatformCategory;
  parserId: string;
  hosts: string[];
  urlHints: string[];
  defaultUrlPlaceholder: string;
  includeKeywords: string[];
  excludeKeywords: string[];
  areaKeywords: string[];
  areaBlacklist: string[];
  priceKeywords: string[];
  rowAvailableKeywords: string[];
  rowSoldOutKeywords: string[];
  tableHeaderKeywords: string[];
  notes: string;
  warning?: string;
};

export type QuickTemplate = {
  id: string;
  name: string;
  platform: string;
  url: string;
  description: string;
};

export const CPBL_ROW_AVAILABLE = [
  "熱賣中",
  "剩餘",
  "空位",
  "尚有座位",
  "可售",
  "可購買",
  "餘票"
];
export const CPBL_ROW_SOLD_OUT = ["售完", "已售完", "銷售一空"];
export const CPBL_TABLE_HEADERS = ["票區", "票價", "空位", "剩餘", "狀態"];

export const CPBL_INCLUDE = [
  "票區",
  "票價",
  "空位",
  "立即購票",
  "我要購票",
  "可購買",
  "可售",
  "剩餘",
  "剩餘座位",
  "餘票",
  "尚有座位",
  "內野",
  "外野",
  "熱區",
  "加入購物車"
];
export const CPBL_EXCLUDE = [
  "尚未開賣",
  "截止販售",
  "已截止",
  "活動已結束",
  "系統維護"
];
export const CPBL_AREAS = ["內野", "外野", "下層", "上層", "A區", "B區", "C區", "D區", "熱區"];
export const DEFAULT_AREA_BLACKLIST = ["身障", "視線不良", "應援視線不良"];

export const EVENT_ROW_AVAILABLE = [
  "立即購票",
  "立即訂購",
  "立即報名",
  "Buy",
  "Buy Tickets",
  "Register",
  "Available",
  "可購買",
  "可訂購",
  "可報名",
  "剩餘",
  "餘票",
  "尚有票券",
  "空位",
  "可售"
];
export const EVENT_ROW_SOLD_OUT = [
  "已售完",
  "售完",
  "已額滿",
  "銷售一空",
  "暫無票券",
  "Sold Out",
  "Unavailable",
  "Not Available"
];
export const EVENT_TABLE_HEADERS = [
  "票區",
  "區域",
  "座位區",
  "票價",
  "價格",
  "空位",
  "剩餘",
  "狀態",
  "Area",
  "Price",
  "Remaining",
  "Status"
];

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
  "尚未開賣",
  "尚未啟售",
  "活動已結束",
  "截止販售",
  "已截止",
  "系統維護"
];

const generic: Omit<
  PlatformDefault,
  "id" | "labelZh" | "labelEn" | "category" | "parserId" | "hosts" | "urlHints" | "defaultUrlPlaceholder"
> = {
  includeKeywords: EVENT_INCLUDE,
  excludeKeywords: EVENT_EXCLUDE,
  areaKeywords: [],
  areaBlacklist: DEFAULT_AREA_BLACKLIST,
  priceKeywords: [],
  rowAvailableKeywords: EVENT_ROW_AVAILABLE,
  rowSoldOutKeywords: EVENT_ROW_SOLD_OUT,
  tableHeaderKeywords: EVENT_TABLE_HEADERS,
  notes: "請貼上實際官方售票頁網址。系統只通知，不自動登入、不選位、不購買。",
  warning: "平台預設只會帶入關鍵字，真正監控仍需使用實際活動頁 URL。"
};

const cpbl: Omit<
  PlatformDefault,
  "id" | "labelZh" | "labelEn" | "category" | "parserId" | "hosts" | "urlHints" | "defaultUrlPlaceholder"
> = {
  includeKeywords: CPBL_INCLUDE,
  excludeKeywords: CPBL_EXCLUDE,
  areaKeywords: CPBL_AREAS,
  areaBlacklist: DEFAULT_AREA_BLACKLIST,
  priceKeywords: [],
  rowAvailableKeywords: CPBL_ROW_AVAILABLE,
  rowSoldOutKeywords: CPBL_ROW_SOLD_OUT,
  tableHeaderKeywords: CPBL_TABLE_HEADERS,
  notes: "CPBL 熱區監控模板。請換成實際場次 URL 後再啟用；只通知，不自動購買。",
  warning: "不要啟用 placeholder URL。遇到驗證、排隊或登入需求時，只會通知人工處理。"
};

function withOverrides(
  base: typeof generic,
  overrides: Partial<typeof generic>
): typeof generic {
  return { ...base, ...overrides };
}

function eventPlatform(
  id: string,
  labelZh: string,
  labelEn: string,
  defaultUrlPlaceholder: string,
  hosts: string[] = [],
  overrides: Partial<typeof generic> = {}
): PlatformDefault {
  return {
    id,
    labelZh,
    labelEn,
    category: hosts.some((host) => host.includes(".hk") || host.includes("hkticketing") || host.includes("cityline")) ? "hk" : "concert",
    parserId: id,
    hosts,
    urlHints: hosts,
    defaultUrlPlaceholder,
    ...withOverrides(generic, overrides)
  };
}

function cpblPlatform(
  id: string,
  labelZh: string,
  labelEn: string,
  defaultUrlPlaceholder: string,
  hosts: string[] = [],
  overrides: Partial<typeof cpbl> = {}
): PlatformDefault {
  return {
    id,
    labelZh,
    labelEn,
    category: "cpbl",
    parserId: id,
    hosts,
    urlHints: hosts,
    defaultUrlPlaceholder,
    ...withOverrides(cpbl, overrides)
  };
}

export const PLATFORM_DEFAULTS: PlatformDefault[] = [
  {
    id: "generic",
    labelZh: "通用公開頁面",
    labelEn: "Generic",
    category: "generic",
    parserId: "generic",
    hosts: [],
    urlHints: [],
    defaultUrlPlaceholder: "https://example.com/YOUR_EVENT_URL",
    ...generic
  },
  eventPlatform("tixcraft", "TixCraft / 拓元", "TixCraft", "https://tixcraft.com/activity/detail/YOUR_EVENT_ID", ["tixcraft.com"], {
    rowAvailableKeywords: ["立即購票", "購票", "可購買", "剩餘", "Available"],
    rowSoldOutKeywords: ["已售完", "售完", "暫無票券"],
    excludeKeywords: ["尚未開賣", "活動已結束", "截止販售", "系統維護"]
  }),
  eventPlatform("teamear", "Teamear", "Teamear", "https://teamear.example.com/YOUR_EVENT_URL", ["teamear.example.com"]),
  eventPlatform("ticketmaster", "Ticketmaster", "Ticketmaster", "https://www.ticketmaster.com/YOUR_EVENT_URL", ["ticketmaster.com"]),
  eventPlatform("indievox", "Indievox", "Indievox", "https://www.indievox.com/activity/detail/YOUR_EVENT_ID", ["indievox.com"]),
  eventPlatform("kktix", "KKTIX", "KKTIX", "https://kktix.com/events/YOUR_EVENT_ID", ["kktix.com"], {
    rowAvailableKeywords: ["立即報名", "報名", "Register", "Available", "剩餘", "可報名"],
    rowSoldOutKeywords: ["已額滿", "Sold Out", "售完"],
    excludeKeywords: ["尚未開賣", "活動已結束", "截止販售", "系統維護"]
  }),
  eventPlatform("ticketplus", "TicketPlus / 遠大售票", "TicketPlus", "https://ticketplus.com.tw/activity/YOUR_EVENT_ID", ["ticketplus.com.tw"], {
    rowAvailableKeywords: ["立即購票", "可購買", "剩餘", "Buy", "Available"],
    rowSoldOutKeywords: ["已售完", "售完", "Sold Out"],
    excludeKeywords: ["尚未開賣", "活動已結束", "截止販售", "系統維護"]
  }),
  eventPlatform("ibon", "iBon 售票", "iBon", "https://orders.ibon.com.tw/application/UTK02/YOUR_EVENT_URL", ["orders.ibon.com.tw"], {
    includeKeywords: ["活動名稱", "演出日期", "場館", "票區", "票價", "空位", "剩餘", "立即訂購", "可訂購", "可購買", "選擇票區"],
    rowAvailableKeywords: ["立即訂購", "立即購票", "可訂購", "可購買", "選擇票區", "剩餘", "空位", "尚有座位", "可售"],
    rowSoldOutKeywords: ["已售完", "售完", "暫無票券"],
    excludeKeywords: ["尚未開賣", "截止販售", "已截止", "活動已結束", "系統維護"]
  }),
  eventPlatform("era_ticket", "年代售票", "ERA Ticket", "https://ticket.com.tw/application/UTK01/YOUR_EVENT_URL", ["ticket.com.tw"], {
    rowAvailableKeywords: ["立即購票", "可購買", "剩餘", "空位"],
    rowSoldOutKeywords: ["已售完", "售完", "暫無票券"],
    excludeKeywords: ["尚未開賣", "截止販售", "已截止", "活動已結束", "系統維護"]
  }),
  eventPlatform("kham", "寬宏 KHAM", "KHAM", "https://kham.com.tw/application/UTK02/YOUR_EVENT_URL", ["kham.com.tw"], {
    rowAvailableKeywords: ["立即購票", "可購買", "剩餘", "空位"],
    rowSoldOutKeywords: ["已售完", "售完", "暫無票券"],
    excludeKeywords: ["尚未開賣", "截止販售", "已截止", "活動已結束", "系統維護"]
  }),
  eventPlatform("cityline", "Cityline 買飛", "Cityline", "https://www.cityline.com/Events.html", ["cityline.com"]),
  eventPlatform("hkticketing", "HKTicketing 快達票", "HKTicketing", "https://www.hkticketing.com/events/YOUR_EVENT_ID", ["hkticketing.com"]),
  eventPlatform("famiticket", "FamiTicket / FamiLife", "FamiTicket", "https://www.famiticket.com.tw/YOUR_EVENT_URL", ["famiticket.com.tw", "fami.life"], {
    includeKeywords: ["票區", "票價", "空位", "熱區", "剩餘", "立即購票", "我要購票", "可購買"],
    rowAvailableKeywords: ["立即購票", "我要購票", "可購買", "熱區", "剩餘", "空位", "尚有座位", "可售"],
    rowSoldOutKeywords: ["已售完", "售完", "暫無票券"],
    excludeKeywords: ["尚未開賣", "活動已結束", "截止販售", "系統維護"]
  }),
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

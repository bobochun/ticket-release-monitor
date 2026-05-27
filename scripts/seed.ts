import { initDb } from "../src/server/db/index";
import { createDiscoveryRule, listDiscoveryRules } from "../src/server/discovery";
import { createTarget, listTargets } from "../src/server/targets";
import type { DiscoveryRuleInput, TargetInput } from "../src/shared/types";
import { getDbEnvInfo, loadLocalEnvFiles, printEnvLoadSummary } from "./db-env";

const loadedFiles = loadLocalEnvFiles();
printEnvLoadSummary(loadedFiles);
console.log(`Database: ${getDbEnvInfo().label}`);

const cpblInclude = ["立即購票", "我要購票", "可購買", "剩餘", "熱區", "空位"];
const cpblExclude = ["尚未開賣", "截止販售", "活動已結束", "已截止"];
const cpblAreas = ["熱區", "A1", "A2", "B1", "B2"];
const cpblAreaBlacklist = ["身障", "視線不良"];

const eventInclude = [
  "立即購票",
  "立即訂購",
  "立即報名",
  "Buy",
  "Buy Tickets",
  "Register",
  "Available",
  "可購買",
  "可訂購",
  "剩餘",
  "空位",
  "選擇票區",
  "下一步",
  "加入購物車"
];
const eventExclude = [
  "暫無票券",
  "尚未開賣",
  "尚未啟售",
  "活動已結束",
  "截止販售",
  "已截止",
  "銷售一空",
  "Not Available",
  "Unavailable"
];

const targets: TargetInput[] = [
  {
    name: "中信兄弟售票範例",
    platform: "cpbl_ctbc_brothers",
    url: "https://tix.ctbcsports.com/BROTHERS/UTK0204_?PERFORMANCE_ID=P16BP6ZZ&PRODUCT_ID=P16ANF0N",
    enabled: true,
    isTemplate: false,
    checkIntervalSeconds: 300,
    timeoutMs: 30000,
    includeKeywords: ["立即購票", "我要購票", "可購買", "剩餘", "熱區", "空位", "加入購物車"],
    excludeKeywords: ["尚未開賣", "截止販售", "活動已結束", "已截止"],
    areaKeywords: cpblAreas,
    areaBlacklist: cpblAreaBlacklist,
    priceKeywords: [],
    notes: "只通知，不自動登入、不自動購買。"
  },
  {
    name: "富邦悍將 FamiLife 範例",
    platform: "cpbl_fubon_guardians",
    url: "https://guardians.fami.life/UTK0204_?PERFORMANCE_ID=P17ITAUR&PRODUCT_ID=P15UU08Q",
    enabled: true,
    isTemplate: false,
    checkIntervalSeconds: 300,
    timeoutMs: 30000,
    includeKeywords: ["立即購票", "我要購票", "可購買", "剩餘", "熱區", "空位", "加入購物車"],
    excludeKeywords: ["尚未開賣", "截止販售", "活動已結束", "已截止"],
    areaKeywords: cpblAreas,
    areaBlacklist: cpblAreaBlacklist,
    priceKeywords: [],
    notes: "只通知，不自動登入、不自動購買。"
  },
  {
    name: "iBon 售票範例",
    platform: "ibon",
    url: "https://orders.ibon.com.tw/application/UTK02/UTK0201_000.aspx?PERFORMANCE_ID=B0B6QO2Q&PRODUCT_ID=B0AP9IZH&strItem=WEB%E7%B6%B2%E7%AB%99%E5%85%A5%E5%8F%A31",
    enabled: true,
    isTemplate: false,
    checkIntervalSeconds: 300,
    timeoutMs: 30000,
    includeKeywords: ["立即購票", "立即訂購", "可購買", "可訂購", "剩餘", "空位", "選擇票區"],
    excludeKeywords: ["尚未開賣", "截止販售", "活動已結束", "已截止"],
    areaKeywords: cpblAreas,
    areaBlacklist: cpblAreaBlacklist,
    priceKeywords: [],
    notes: "iBon 頁面若要求驗證，程式只通知人工處理。"
  },
  ...[
    ["富邦悍將售票模板", "cpbl_fubon_guardians", "https://guardians.fami.life/"],
    ["中信兄弟售票模板", "cpbl_ctbc_brothers", "https://tix.ctbcsports.com/BROTHERS/"],
    ["統一獅售票模板", "cpbl_unilions", "https://tix.example.com/unilions/YOUR_EVENT_URL"],
    ["樂天桃猿售票模板", "cpbl_rakuten_monkeys", "https://tix.example.com/rakuten-monkeys/YOUR_EVENT_URL"],
    ["味全龍售票模板", "cpbl_weichuan_dragons", "https://tix.example.com/weichuan-dragons/YOUR_EVENT_URL"],
    ["台鋼雄鷹售票模板", "cpbl_tsg_hawks", "https://tix.example.com/tsg-hawks/YOUR_EVENT_URL"]
  ].map(([name, platform, url]) => ({
    name,
    platform,
    url,
    enabled: false,
    isTemplate: true,
    checkIntervalSeconds: 300,
    timeoutMs: 30000,
    includeKeywords: cpblInclude,
    excludeKeywords: cpblExclude,
    areaKeywords: cpblAreas,
    areaBlacklist: cpblAreaBlacklist,
    priceKeywords: [],
    notes: "請換成實際場次 URL 後再啟用。不要讓 cron 監控 placeholder URL。"
  })),
  ...[
    ["TixCraft / 拓元模板", "tixcraft", "https://tixcraft.com/activity/detail/YOUR_EVENT_ID"],
    ["KKTIX 模板", "kktix", "https://kktix.com/events/YOUR_EVENT_ID"],
    ["TicketPlus / 遠大售票模板", "ticketplus", "https://ticketplus.com.tw/activity/YOUR_EVENT_ID"],
    ["iBon 售票模板", "ibon", "https://orders.ibon.com.tw/application/UTK02/YOUR_EVENT_URL"],
    ["年代售票模板", "era_ticket", "https://ticket.com.tw/application/UTK01/YOUR_EVENT_URL"],
    ["寬宏售票 / KHAM 模板", "kham", "https://kham.com.tw/application/UTK02/YOUR_EVENT_URL"],
    ["Cityline 買飛模板", "cityline", "https://www.cityline.com/Events.html"],
    ["HKTicketing 快達票模板", "hkticketing", "https://www.hkticketing.com/events/YOUR_EVENT_ID"],
    ["Ticketmaster 模板", "ticketmaster", "https://www.ticketmaster.com/YOUR_EVENT_URL"],
    ["Indievox 模板", "indievox", "https://www.indievox.com/activity/detail/YOUR_EVENT_ID"],
    ["Teamear 模板", "teamear", "https://teamear.example.com/YOUR_EVENT_URL"],
    ["FamiTicket / FamiLife 模板", "famiticket", "https://www.famiticket.com.tw/YOUR_EVENT_URL"],
    ["FANSI GO 模板", "fansi_go", "https://fansi.example.com/YOUR_EVENT_URL"],
    ["FunOne 模板", "funone", "https://funone.example.com/YOUR_EVENT_URL"]
  ].map(([name, platform, url]) => ({
    name,
    platform,
    url,
    enabled: false,
    isTemplate: true,
    checkIntervalSeconds: 300,
    timeoutMs: 30000,
    includeKeywords: eventInclude,
    excludeKeywords: eventExclude,
    areaKeywords: [],
    areaBlacklist: ["身障", "視線不良"],
    priceKeywords: [],
    notes: "請換成實際活動 URL 後再啟用。不要監控 placeholder URL。遇到排隊或驗證只通知人工處理。"
  }))
];

const discoveryRules: DiscoveryRuleInput[] = [
  {
    name: "CPBL 富邦悍將候選場次搜尋",
    platform: "cpbl_fubon_guardians",
    enabled: false,
    seedUrls: ["https://guardians.fami.life/"],
    includeKeywords: ["富邦", "悍將", "新莊"],
    optionalKeywords: ["中信", "兄弟", "統一", "樂天", "味全", "台鋼", "熱區", "A1", "B1"],
    excludeKeywords: ["已結束", "售完", "截止"],
    dateKeywords: [],
    venueKeywords: ["新莊", "新莊棒球場"],
    teamKeywords: ["富邦悍將"],
    seatKeywords: cpblAreas,
    maxCandidates: 20
  },
  {
    name: "CPBL 中信兄弟候選場次搜尋",
    platform: "cpbl_ctbc_brothers",
    enabled: false,
    seedUrls: ["https://tix.ctbcsports.com/BROTHERS/"],
    includeKeywords: ["中信", "兄弟"],
    optionalKeywords: ["洲際", "大巨蛋", "富邦", "統一", "樂天", "味全", "台鋼", "熱區", "A1", "B1"],
    excludeKeywords: ["已結束", "售完", "截止"],
    dateKeywords: [],
    venueKeywords: ["洲際", "台中洲際", "大巨蛋"],
    teamKeywords: ["中信兄弟"],
    seatKeywords: cpblAreas,
    maxCandidates: 20
  },
  {
    name: "CPBL 通用候選場次搜尋",
    platform: "generic",
    enabled: false,
    seedUrls: ["https://www.cpbl.com.tw/"],
    includeKeywords: ["中華職棒", "售票", "購票"],
    optionalKeywords: [
      "富邦",
      "悍將",
      "中信",
      "兄弟",
      "統一",
      "獅",
      "樂天",
      "桃猿",
      "味全",
      "龍",
      "台鋼",
      "雄鷹",
      "大巨蛋",
      "新莊",
      "洲際",
      "桃園",
      "台南",
      "澄清湖"
    ],
    excludeKeywords: ["已結束", "售完", "截止"],
    dateKeywords: [],
    venueKeywords: ["大巨蛋", "新莊", "洲際", "桃園", "台南", "澄清湖", "天母"],
    teamKeywords: ["富邦悍將", "中信兄弟", "統一獅", "樂天桃猿", "味全龍", "台鋼雄鷹"],
    seatKeywords: cpblAreas,
    maxCandidates: 30
  },
  {
    name: "演唱會平台通用候選搜尋",
    platform: "generic",
    enabled: false,
    seedUrls: [
      "https://tixcraft.com/activity",
      "https://kktix.com/events",
      "https://ticketplus.com.tw/",
      "https://ticket.com.tw/",
      "https://kham.com.tw/",
      "https://www.indievox.com/",
      "https://www.ticketmaster.com/"
    ],
    includeKeywords: ["演唱會", "concert", "live", "tour", "售票", "購票"],
    optionalKeywords: ["台北", "高雄", "台中", "大巨蛋", "小巨蛋", "加場", "搖滾", "VIP", "特區"],
    excludeKeywords: ["已結束", "售完", "截止"],
    dateKeywords: [],
    venueKeywords: ["台北小巨蛋", "高雄巨蛋", "台北流行音樂中心", "Legacy", "Zepp", "大巨蛋"],
    teamKeywords: [],
    seatKeywords: ["VIP", "搖滾", "特A", "特B", "一樓", "二樓", "站區", "坐區"],
    maxCandidates: 30
  }
];

await initDb();

const existingTargets = await listTargets();
if (existingTargets.length === 0) {
  for (const target of targets) {
    await createTarget(target);
  }
  console.log(`Seeded ${targets.length} targets.`);
} else {
  console.log(`Skipped target seed. Existing targets: ${existingTargets.length}.`);
}

const existingRules = await listDiscoveryRules();
if (existingRules.length === 0) {
  for (const rule of discoveryRules) {
    await createDiscoveryRule(rule);
  }
  console.log(`Seeded ${discoveryRules.length} discovery rules.`);
} else {
  console.log(`Skipped discovery seed. Existing rules: ${existingRules.length}.`);
}

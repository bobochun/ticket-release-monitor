# 平台 Parser 支援範圍

Ticket Radar 目前使用 parserRegistry 依平台選擇 parser。所有 parser 都只解析公開可見內容，不登入、不點擊、不購買。

## 已接入平台

- `generic`：通用公開頁 parser
- `cpbl_ctbc_brothers`：中信兄弟公開票區 parser
- `cpbl_fubon_guardians`：富邦悍將 / FamiLife parser
- `ibon`：iBon parser
- `famiticket`：FamiTicket / FamiLife parser
- `tixcraft`：TixCraft / 拓元 MVP parser
- `kktix`：KKTIX MVP parser
- `ticketplus`：TicketPlus MVP parser
- `era_ticket`：年代售票 MVP parser
- `kham`：寬宏 KHAM MVP parser
- `cityline`：Cityline MVP parser
- `hkticketing`：HKTicketing MVP parser
- `indievox`：Indievox MVP parser
- `ticketmaster`、`teamear`、`fansi_go`、`funone`：平台專屬 parserId，使用客製關鍵字與 generic row parser

## 中信兄弟 parser

支援這類公開票區 row：

```txt
內野南A區下層 / 400 / 熱賣中
內野西C區下層 / 500 / 8
內野D區下層 / 500 / 售完
```

`售完` 只代表該票區售完，不會讓整場變成 unavailable。

## iBon / FamiLife 備援

如果 server-side fetch 取得不到完整票區，系統會保留安全狀態與訊息，建議使用 Manual Parse 貼上你在官方頁看到的公開票區內容。

# Row-level Availability 逐列票區判斷

過去用整頁關鍵字判斷時，只要頁面有 `售完` 或 `已售完`，就可能把整場誤判為沒有票。這對票區列表不正確，因為同一頁可能同時存在可買與售完票區。

## 新邏輯

1. 先解析每個票區 row。
2. 每列獨立判斷 `isAvailable` 與 `isSoldOut`。
3. `售完`、`已售完`、`Sold Out` 只套用該 row。
4. `areaBlacklist` 只排除該 row。
5. `priceKeywords` 只套用該 row。
6. `strict` 模式下，有同一列 row 同時符合 area / price / date / venue 條件 → `AVAILABLE`。
7. 有可用 row 但未符合指定條件 → `POSSIBLE_MATCH`，預設只寫 History，不通知。
8. 全部 row 都售完 → `UNAVAILABLE`。
9. 完全沒有 row-level areas 時，才 fallback 到整頁 keyword。

## Strict / Normal / Loose

- `strict`：預設模式。若設定票區與價格，必須同一個可用 row 同時符合，才通知。
- `normal`：票區或價格其中一個條件符合即可視為符合。
- `loose`：保留舊式寬鬆判斷，有任一可用票區就列入可能符合。

建議正式監控使用 `strict` 搭配 `notifyOn=available_only`。

## 價格 exact match

價格會正規化成數字後比對：

- `900`
- `$900`
- `NT$900`
- `900元`
- `TWD 900`
- `1,200`

填 `900` 只會匹配 row price `900`，不會匹配 `550`、`90` 或 `1900`。

## 範例

```txt
內野南A區下層 400 熱賣中
內野西C區下層 500 8
內野D區下層 500 售完
```

結果：

- `內野南A區下層`：可用
- `內野西C區下層`：可用，剩餘 8
- `內野D區下層`：售完

如果 target 指定 `C區`，會命中 `內野西C區下層`，狀態為 `AVAILABLE`。

如果 target 指定 `priceKeywords=["900"]`，但頁面只有 `550 / 350 / 300 / 450`，狀態會是 `POSSIBLE_MATCH`，`unmetConditions` 會記錄 `price: 900`，通知會依預設門檻跳過。

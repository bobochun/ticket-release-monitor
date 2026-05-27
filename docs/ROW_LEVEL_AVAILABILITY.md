# Row-level Availability 逐列票區判斷

過去用整頁關鍵字判斷時，只要頁面有 `售完` 或 `已售完`，就可能把整場誤判為沒有票。這對票區列表不正確，因為同一頁可能同時存在可買與售完票區。

## 新邏輯

1. 先解析每個票區 row。
2. 每列獨立判斷 `isAvailable` 與 `isSoldOut`。
3. `售完`、`已售完`、`Sold Out` 只套用該 row。
4. `areaBlacklist` 只排除該 row。
5. `priceKeywords` 只套用該 row。
6. 有符合 area / price 條件的可用 row → `AVAILABLE`。
7. 有可用 row 但未符合指定條件 → `POSSIBLE_MATCH`。
8. 全部 row 都售完 → `UNAVAILABLE`。
9. 完全沒有 row-level areas 時，才 fallback 到整頁 keyword。

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

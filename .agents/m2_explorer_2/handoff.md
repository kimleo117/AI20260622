# Handoff Report - Milestone 2 Technical Exploration

## 1. Observation (觀察)

1. **現有時間戳解析器邏輯 (`soundsync.html` 547-557 行)**：
   ```javascript
   function parseSeconds(str) {
     if (!str) return 0;
     const parts = String(str).split(":");
     if (parts.length === 3) {
       return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
     }
     if (parts.length === 2) {
       return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
     }
     return parseFloat(str) || 0;
   }
   ```
   - 若 `str` 包含全形冒號 `「：」`，如 `"01：23.450"`，`split(":")` 不會切割，`parts.length` 為 1，`parseFloat("01：23.450")` 傳回 `1` 秒，導致 **01 分鐘數遺失/丟棄**。
   - 若 `str` 包含 LRC 括弧 `"[01:23.45]"`，`parseFloat("[01")` 傳回 `NaN`，導致 `parseSeconds` 傳回 `NaN`。

2. **字幕渲染與播放器聯動崩潰風險 (`soundsync.html` 572-573, 580-586 行)**：
   ```javascript
   div.setAttribute("data-start", parseSeconds(item.start));
   div.setAttribute("data-end", parseSeconds(item.end));
   // ...
   div.addEventListener("click", function() {
     const s = parseFloat(this.getAttribute("data-start"));
     if (!isNaN(s)) {
       audioPlayer.currentTime = s;
       audioPlayer.play();
     }
   });
   ```
   - 若 `parseSeconds` 回傳 `NaN`，DOM 屬性被設為 `data-start="NaN"`，`parseFloat("NaN")` 傳回 `NaN`，`isNaN(NaN)` 雖然有防護，但若 DOM 屬性寫入非數字可能影響屬性與提詞器觸發比對 (`curTime >= s && curTime <= e`)。

3. **現有錯誤轉譯器與 UI 互動缺陷 (`soundsync.html` 370-376, 501-531 行)**：
   - 401/403 金鑰無效時，僅使用 `alert(getFriendlyChineseError(err.message))` 顯示訊息，未自動執行 `apiKeyInput.focus()` 或全選 `apiKeyInput.select()`，缺乏 UI 自動導引。
   - 500/503 伺服器忙碌時，僅提醒「請等待 10 秒後重新點擊」，缺乏倒數計時秒數 UI 與自動重試連鎖。

4. **API Key UI 與持久化邏輯 (`soundsync.html` 341-361 行)**：
   - 目前只要非空字串即可存入 `localStorage.setItem("soundsync_gemini_key", val)`，缺乏 `AIzaSy` 前綴與格式驗證，亦無眼睛 (👁️) 密碼切換與一鍵清除 (🗑️) 功能。

5. **單元測試覆蓋狀態 (`tests/tier1_functional/tier1_f06_f10.test.js` 與 `tests/tier2_boundary/tier2_boundaries.test.js`)**：
   - 測試架構已具備 `F08-1 ~ F08-5`（時間戳解析）與 `T2-11 ~ T2-14`（錯誤轉譯）之斷言測試基礎。

---

## 2. Logic Chain (推論鏈)

1. **時間戳解析防護鏈**：
   - **觀察 1** 顯示全形冒號與 LRC 括弧會破壞 `split(":")` 與 `parseFloat`。
   - **推理**：必須在 `split` 前先執行正則替換 `String(input).replace(/：/g, ':').replace(/[\[\]]/g, '').trim()`。
   - **觀察 1** 中 `parts.length === 2` 的情境，若秒數或分鐘數其中之一含非法字元，`parseFloat` 會傳回 `NaN`。
   - **推理**：在 2 段式解析中必須針對 `m` 與 `s` 分別進行 `isNaN` 判定，若其中一項無效則降級備用（保留有效的項目），避免分鐘數丟失或整體變為 `NaN`。
   - **推理**：最後出口處必須有 `isNaN(result) ? 0 : Math.max(0, result)` 的強固出口防線，確保百分之百傳回非負有限數字。

2. **錯誤轉譯與 UI 聯動鏈**：
   - **觀察 3** 顯示現有錯誤處理僅跳出文字 `alert`，沒有 UI 聚焦與控制。
   - **推理**：針對 401/403 錯誤，應在觸發 alert 後（或替代 alert 方案）自動呼叫 `apiKeyInput.focus()` 與 `apiKeyInput.select()`，並增加紅框樣式；針對 429 額度超限，應自動突顯 `https://aistudio.google.com/app/apikey` 超連結。
   - **推理**：針對 500/503 伺服器忙碌，應建立倒數計時器（`setInterval`），於 UI 顯示 `「🌐 Google 伺服器忙碌中，系統將於 10...9...8 秒後自動重試...」` 並執行 `Candidate Model Fallback Chain` 重試。

3. **API Key UI 與持久化安全鏈**：
   - **觀察 4** 顯示金鑰未經過格式檢驗即寫入 `localStorage`。
   - **推理**：儲存前增加格式檢驗 (`!val.startsWith("AIzaSy") || val.length < 30`)，能即時擋下無效輸入；增加 👁️ 切換與 🗑️ 清除能提升整體 UX。
   - **推理**：保持 `localStorage` 存取與 Request Query Parameter 發送，不印出 Console Log，即可滿足 100% 零洩漏安全要求。

---

## 3. Caveats (注意事項)

1. **瀏覽器 LocalStorage 權限**：若使用者設定瀏覽器為無痕模式 (Incognito Mode) 或禁用 LocalStorage，`localStorage.setItem` 可能會拋出 `QuotaExceededError` 或 `SecurityError`。實作時需以 `try-catch` 包裹 `localStorage` 存取操作。
2. **Google Gemini API Key 格式演進**：雖然目前金鑰絕大多數以 `AIzaSy` 為前綴，但格式檢驗應保持適當彈性（如允許長度大於 30 之字串），避免 Google 未來調整 Key 前綴時導致誤判。

---

## 4. Conclusion (結論)

1. **`parseSeconds` 時間戳解析器**：現有程式碼存在全形冒號導致「2 段式分鐘數遺失漏洞」與 `NaN` 連鎖風險。已於 `analysis.md` 提供完全相容 `HH:MM:SS.mmm`、`MM:SS.mmm` 與純秒數的防護型演算法。
2. **100% 台灣繁體中文 API 錯誤轉譯機制**：已完成 429、401/403、500/503 及網路異常的中文訊息轉譯對照表，並規劃了 401 自動鎖定焦點、429 超連結引導與 500/503 秒數倒數重試 UI。
3. **API Key 管理 UI 與持久化**：已規劃包含 `AIzaSy` 格式校驗、顯示/隱藏切換 (👁️)、一鍵清除 (🗑️) 以及全過程零洩漏安全機制。

---

## 5. Verification Method (驗證方式)

1. **獨立檔案檢查**：
   - 檢查 `C:\外掛\影像\workspace\AI20260622-main\.agents\m2_explorer_2\analysis.md`
   - 檢查 `C:\外掛\影像\workspace\AI20260622-main\.agents\m2_explorer_2\handoff.md`
2. **單元測試與功能驗證**：
   - 後續實作完成後，可以執行測試套件（如 `tests/tier1_functional/tier1_f06_f10.test.js` 與 `tests/tier2_boundary/tier2_boundaries.test.js`）驗證以下情境：
     - `parseSeconds("01:23.456")` 應傳回 `83.456`
     - `parseSeconds("[01：23.456]")` 應正確替換全形冒號與中括弧傳回 `83.456`
     - `getFriendlyChineseError("Quota exceeded 429")` 應包含 `Gemini API 今日免費額度已達上限`
     - `getFriendlyChineseError("API key not valid")` 應包含 `API 金鑰無效或填寫錯誤`

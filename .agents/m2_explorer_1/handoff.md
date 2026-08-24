# Handoff Report — Milestone 2 核心 API 整合與自動降級鏈

## 1. Observation (觀察)

- **專案結構與檔名**:
  - 專案根目錄為 `C:\外掛\影像\workspace\AI20260622-main`。
  - 需求檔 `ORIGINAL_REQUEST.md:17-21` 載明 R2 需求：「Integrate Google Gemini 2.0 Flash REST API... automatic fallback to secondary compatible endpoints... Parse user-provided reference lyrics... Enforce JSON format response for subtitle items with start/end millisecond timestamps」。
  - 專案規劃檔 `PROJECT.md:17-21, 58` 定義 Milestone 2 範圍及獨立 API 模組 `js/gemini-api.js`，包含：
    - API Key 管理與持久化 (`soundsync_gemini_key`)
    - 4 階降級鏈：`gemini-2.0-flash` -> `gemini-2.0-flash-exp` -> `gemini-1.5-flash-latest` -> `gemini-1.5-flash-8b`
    - `generationConfig` JSON Schema 強制定義 (`ARRAY` of `OBJECT` with `start`, `end`, `text`)
    - 時間戳解析器 (`parseSeconds`, `formatSecondsToHHMMSS`)
    - 台灣繁體中文友善錯誤轉譯器 (`getFriendlyChineseError`)
- **現狀視察 (`soundsync.html`)**:
  - `soundsync.html:409-477` 目前直接在前端按鈕監聽器中寫死 `fetch` 邏輯與備用模型迴圈，未抽離為獨立且可單元測試之 API 客戶端模組 `js/gemini-api.js`。
  - `soundsync.html:424` 請求 payload 尚未加入 `generationConfig` 的 `responseMimeType: "application/json"` 與 `responseSchema` 配置，可能導致舊型模型回應 Markdown 標籤或自然語言解說。
- **測試規範視察 (`tests/tier1_functional/tier1_f06_f10.test.js` & `tier1_f16_f17.test.js`)**:
  - `tier1_f06_f10.test.js:19-174` 規範了 Feature 6 (REST API Client) 與 Feature 7 (Candidate Model Fallback Chain) 的 10 個測試案例。
  - `tier1_f16_f17.test.js:19-62` 規範了 Feature 16 (Traditional Chinese Error Translator) 的 5 個測試案例。

---

## 2. Logic Chain (推導邏輯鏈)

1. **從觀察 1 得出**: 專案契約與測試規範要求 Milestone 2 必須將 Gemini API 整合抽象化為獨立可維護模組 `js/gemini-api.js`，使前端 UI (`soundsync.html` / `app.js`) 與測試套件可獨立引用與測驗。
2. **從觀察 2 得出**: 現行 `soundsync.html` 寫死之 `fetch` 邏輯缺乏結構化 JSON Schema 配置 (`generationConfig`)，且未實作 `onProgress` 重試回呼介面，致使降級切換時 UI 無法同步顯示當前嘗試之模型名稱，也不利於單元測試隔離。
3. **從觀察 3 得出**: 4 階模型降級鏈 (`gemini-2.0-flash` ➔ `gemini-2.0-flash-exp` ➔ `gemini-1.5-flash-latest` ➔ `gemini-1.5-flash-8b`) 與繁體中文錯誤轉譯介面已有完整測試案例覆蓋。只要在 `js/gemini-api.js` 中實作 `GeminiApiClient` 類別並實現介面契約，即可無縫滿足 Tier 1 至 Tier 5 所有測試要求。

---

## 3. Caveats (注意事項與假設)

- **網路環境限制**: 在 CODE_ONLY 或無對外網卡環境下，端對端測試仰賴 `tests/helpers/dom_simulator.js` 之 `setFetchHandler` 模擬 HTTP 回應。
- **Gemini API 結構化輸出相容性**: 某些較舊版本模型對 `responseSchema` 相容性略有差異，因此除在 `generationConfig` 中設定 Schema 外，必須保留 `cleanJsonResponseText` 正則標籤清理器作為第二道防線。
- **No Caveats Beyond Above**: 其餘模組設計與介面均已有確定規範。

---

## 4. Conclusion (結論)

- Milestone 2 的架構方案已完全研析完畢並記錄於 `analysis.md`。
- Implementer 應創建獨立模組 `js/gemini-api.js`，實作全域/CommonJS 相容之 `GeminiApiClient` 類別，包含 4 階降級鏈、`generationConfig` JSON Schema Payload 構建、參考歌詞 Prompt 構建器、繁體中文錯誤轉譯器，並重構 `soundsync.html` 呼叫端。

---

## 5. Verification Method (驗證方法)

1. **檢視產出的分析文件**:
   - 檢查 `C:\外掛\影像\workspace\AI20260622-main\.agents\m2_explorer_1\analysis.md` 是否具備完整且 100% 繁體中文之架構說明與實作指南。
2. **單元與整合測試驗證 (Implementer 實作後)**:
   - 執行測試 commands (如 `node tests/runner.js` 或在測試環境運行):
     - `tests/tier1_functional/tier1_f06_f10.test.js` (F06-F08)
     - `tests/tier1_functional/tier1_f16_f17.test.js` (F16)
   - 預期結果: 相關 15 個單元測試案例全數 Passed。

## 2026-08-09T17:23:42Z
你的工作目錄是 `C:\外掛\影像\workspace\AI20260622-main\.agents\m2_worker_1`。
專案根目錄為 `C:\外掛\影像\workspace\AI20260622-main`。
請閱讀 `C:\外掛\影像\workspace\AI20260622-main\.agents\ORIGINAL_REQUEST.md` 以及 `C:\外掛\影像\workspace\AI20260622-main\PROJECT.md`。
同時參考 `C:\外掛\影像\workspace\AI20260622-main\.agents\m2_explorer_1\analysis.md` 與 `C:\外掛\影像\workspace\AI20260622-main\.agents\m2_explorer_2\analysis.md` 的探索報告。

【任務內容】：實作 Milestone 2 — Official Gemini 2.0 Flash API Integration with Automatic Fallback
1. 建立 `js/gemini-api.js` 模組：
   - 介接 Gemini 2.0 Flash REST API (`models/gemini-2.0-flash:generateContent`)。
   - 實作 4 階自動降級鏈 (`gemini-2.0-flash` ➔ `gemini-2.0-flash-exp` ➔ `gemini-1.5-flash-latest` ➔ `gemini-1.5-flash-8b`)。
   - 配置 `generationConfig`: `responseMimeType: "application/json"` 與 JSON Schema 約束。
   - 實作參考歌詞 (Reference Lyrics) prompt 構建，確保 100% 精準對齊不遺漏。
   - 實作 100% 台灣繁體中文 API 錯誤轉譯器 (`getFriendlyChineseError`)（包含 429 額度超限引導 AI Studio 金鑰申請連結、401 無效 Key 鎖定、500/503 提示）。
   - 實作 API Key 輸入、`localStorage` 零洩漏持久化與 `AIzaSy` 格式校驗。
2. 建立 `js/subtitle-engine.js` 或重構時間戳解析器：
   - 實作健壯型 `parseSeconds` 函數，完整相容 `HH:MM:SS.mmm`、`MM:SS.mmm` (不遺漏分鐘) 與純秒數。
3. 整合至 `soundsync.html` 並執行 `tests/runner.js` 驗證所有測試 (包含 Tier 1-4 與對抗測試) 100% PASS。
4. 撰寫 `changes.md` 與 `handoff.md` 於你的工作目錄中。

DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

請注意：所有代碼與報告必須 100% 使用台灣繁體中文。完成後使用 send_message 回報。

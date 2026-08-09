## 2026-08-10T01:15:24Z
你的工作目錄是 `C:\外掛\影像\workspace\AI20260622-main\.agents\e2e_testing_track`。
專案根目錄為 `C:\外掛\影像\workspace\AI20260622-main`。
請閱讀 `C:\外掛\影像\workspace\AI20260622-main\.agents\ORIGINAL_REQUEST.md` 以及 `C:\外掛\影像\workspace\AI20260622-main\PROJECT.md`。

【任務與職責】：
依據 Dual Track 規範，建置 SoundSync AI 的獨立 E2E 測試套件 (Opaque-box, Requirement-driven, 無侵入式測試)。
1. 建立 `TEST_INFRA.md` 於專案根目錄，記載測試架構、目錄結構、測試執行命令與各 Tier 測試覆蓋率表。
2. 於 `tests/` 目錄建立自動化測試執行腳本與測試案例（涵蓋 Node.js / HTML 測試腳本）：
   - Tier 1: 功能覆蓋測試（17 項 Feature 均需具備獨立測試案例，每項至少 5 個獨立測試）
   - Tier 2: 邊界與極限測試（包含大容量音訊、特殊檔名、損毀音訊、429/401 API 錯誤處理、MM:SS.mmm 時間點等邊界）
   - Tier 3: 跨功能組合測試（音訊重採樣 + Gemini JSON 解析 + 重疊消除器 + 多格式字幕匯出）
   - Tier 4: 真實情境應用測試（完整 MP3 打軸至 SRT/LRC/VTT 下載全流程）
3. 當所有 Tier 1-4 測試套件與執行腳本完成並驗證無誤後，於專案根目錄發布 `TEST_READY.md`。
4. 撰寫 `handoff.md` 於你的工作目錄中。

注意：
- 所有實作與報告必須 100% strike 台灣繁體中文。
- 測試必須真實驗證，不可造假或硬編碼預期結果。
- 完成後請使用 send_message 回報主控 Orchestrator。

# SoundSync AI 前端勘查與缺口評估交接報告 (Handoff Report)

## 1. 觀察 (Observation)

1. **專案檔案架構**：
   - 專案根目錄 `C:\外掛\影像\workspace\AI20260622-main` 包含 `soundsync.html` (617 行)、`index.html` (4,176 行)、`DESIGN.md` (153 行) 與 `AGENTS.md` (92 行)。
   - `js/` 目錄下僅存在 12 個 Bootstrap 腳本檔案，缺乏專屬的 SoundSync JS 業務邏輯模組。
   - `css/` 目錄下僅存在 32 個 Bootstrap 樣式檔案，樣式變數依據 `DESIGN.md` 定義置於 `:root`。

2. **`soundsync.html` 現有實作細節**：
   - **檔案上傳與音訊處理** (第 153 - 168 行, 第 238 - 268 行)：
     - `<input type="file" id="audioFileInput" style="display:none !important;" onchange="...">` 無 `accept` 屬性設定。
     - `handleAudioFile()` 直接調用 `FileReader.readAsDataURL(file)` 讀取完整音訊並轉 Base64。
     - **第 238 - 268 行未見任何 WebAudio 16kHz Mono 重採樣 (Resampling) 邏輯**。
   - **Gemini API 介接與降級機制** (第 358 - 435 行)：
     - 包含 4 個相容模型名稱陣列：`gemini-2.0-flash`, `gemini-2.0-flash-exp`, `gemini-1.5-flash-latest`, `gemini-1.5-flash-8b`。
     - 正確使用 `fetch` 傳送帶音訊 Base64 與提示詞之 JSON body。
     - **第 443 行在 `try` 區塊內部宣告 `function getFriendlyChineseError(rawMsg)`**，導致第 477 行 `catch` 區塊調用時存在作用域風險。
     - **第 373 - 412 行請求 body 中未設定 `"response_mime_type": "application/json"`**，僅依賴提示詞文字要求。
   - **時間軸、提詞機與字幕匯出** (第 485 - 603 行)：
     - `fixSubtitleOverlaps()` (第 485 - 496 行) 修正 $currEnd \ge nextStart$ 之微秒重疊。
     - 提詞機 `timeupdate` 監聽 (第 541 - 557 行) 動態新增 `.active-line` 並調用 `scrollIntoView()`。
     - 下載 `.SRT`, `.LRC`, `.VTT` 與複製 TXT (第 566 - 603 行)。
     - **時間軸容器 `#timelineContainer` 中字幕行僅為 `<span class="lyric-text">` 唯讀顯示，缺乏互動編輯欄位 (Subtitle Editing Area)**。

---

## 2. 邏輯鏈 (Logic Chain)

1. **從觀察 1 與觀察 2.1 導出 R1 缺口結論**：
   - 觀察指出：`handleAudioFile` 使用 `FileReader.readAsDataURL` 直接載入檔案原始 Base64，且未引入 `AudioContext` 或 `OfflineAudioContext`。
   - 需求 R1 要求：提供 WebAudio 16kHz Mono 重採樣流水線以清理人聲軌再發送至 API。
   - 推論：**R1 的 WebAudio 16kHz 重採樣需求目前完全未實作 (Missing)**。大體積音訊將直接傳送，易造成 API 超時或傳輸過大。

2. **從觀察 2.2 導出 R2 改善結論**：
   - 觀察指出：Gemini 2.0 API 已有候選模型降級迴圈，但 `getFriendlyChineseError` 被包在 `try` 內，且 API 請求參數中未指定 `response_mime_type: "application/json"`。
   - 需求 R2 要求：強制 JSON 格式回應並提供自動降級。
   - 推論：**R2 已完成 80%**，但需要修正 JS 作用域 bug 並於 API 請求加上強約束 JSON 設定，以保證 100% 穩定 JSON 輸出。

3. **從觀察 2.3 導出 R3 缺口與導出優化結論**：
   - 觀察指出：字幕顯示區僅為純文字渲染，使用者無法修改字幕或微調時間碼；且 SRT/LRC 時間碼格式化極限邊界缺少強制補零。
   - 需求 R3 與任務要求：勘查字幕顯示與編輯區、一鍵匯出多格式字幕。
   - 推論：**R3 已完成 75%**，但缺口為「字幕編輯區 (Subtitle Editor)」與「時間碼邊界格式補零強化」。

---

## 3. 局限與注意事項 (Caveats)

- 本次勘查為 **唯讀模式 (Read-Only Investigation)**，並未直接修改 `soundsync.html` 或專案原始碼。
- 專案根目錄下 `js/` 與 `css/` 目前僅有 Bootstrap 檔案，未來實作建議將 SoundSync 業務邏輯拆分為獨立模組 JS 檔以利維護。

---

## 4. 結論 (Conclusion)

SoundSync AI 的現有 HTML/CSS UI 結構與基礎互動（播放器控制、模型降級迴圈、時間軸高亮捲動、SRT/LRC 匯出）已具備良好雛形。然而，與 `ORIGINAL_REQUEST.md` (R1/R2/R3) 比對後，存在以下三個核心缺口：
1. **[R1 缺口] 缺乏 WebAudio 16kHz Mono 音訊重採樣處理器**。
2. **[R3 缺口] 缺乏字幕文字與時間碼之現場雙向編輯能力 (Subtitle Editor)**。
3. **[R2/R3 優化] Gemini API 回應需強制 `response_mime_type: "application/json"`，且 `getFriendlyChineseError` 作用域與 SRT/LRC 時間碼格式需進行防護修正**。

---

## 5. 獨立驗證方法 (Verification Method)

實作階段完成後，可透過以下步驟進行獨立驗證：

1. **驗證 R1 WebAudio 重採樣**：
   - 開啟 `soundsync.html`，選擇長度 > 3 分鐘之 WAV/MP3 檔案。
   - 在瀏覽器 Console 中檢查 WebAudio pipeline log，確認音訊經 `OfflineAudioContext` 轉換為 16000Hz 1 channel mono WAV 格式再送出。

2. **驗證 R2 Gemini 2.0 Flash 介接**：
   - 輸入有效 Gemini API Key，點擊「開始打軸」。
   - 檢查 API 傳送之 Request Body 是否包含 `"response_mime_type": "application/json"`。
   - 刻意試驗無效 API Key，確認是否正確跳出繁體中文錯誤彈窗而無 console `ReferenceError`。

3. **驗證 R3 編輯與匯出**：
   - 在產出的時間軸上點擊字幕或時間碼，確認可進行現場編輯。
   - 下載 `.SRT` 並使用文字編輯器開啟，確認時間格式精準為 `00:00:01,200 --> 00:00:04,500`。
   - 下載 `.LRC` 並確認時間格式為 `[00:01.20]`。

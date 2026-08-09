# SoundSync AI 專案前端架構與 UI 需求缺口勘查報告 (Analysis Report)

**勘查日期**：2026-08-10  
**勘查對象**：`C:\外掛\影像\workspace\AI20260622-main` 專案根目錄 (含 `soundsync.html`, `index.html`, `js/`, `css/`, `DESIGN.md`, `AGENTS.md`)  
**報告撰寫人**：`explorer_survey_1`

---

## 1. 勘查背景與目標 (Background & Objectives)

本報告旨在評估 SoundSync AI 專案目前的前端程式碼架構、頁面元件（`soundsync.html`）、音訊播放器控制項、字幕顯示與編輯區、檔案上傳區塊，並比對 `.agents/ORIGINAL_REQUEST.md` 所規範之三項核心需求 (**R1**, **R2**, **R3**) 與驗收標準 (Acceptance Criteria)，產出具體的元件結構分析與缺口矩陣 (Gap Matrix)。

---

## 2. 專案整體架構與 CSS/JS 配置勘查 (Codebase Architecture Survey)

1. **HTML 檔案結構**：
   - `soundsync.html`（617 行）：SoundSync AI 旗艦功能的核心單頁應用程式 (SPA)。包含 API Key 輸入、音訊/歌詞上傳、Gemini AI 端點調用、時間軸播放提詞機與多格式匯出功能。
   - `index.html`（4,176 行）：專案主頁面，已在頂部導覽列（Navbar）植入 `🎵 SoundSync AI 旗艦` 連結。
   - `about.html`, `pricing.html`, `contact.html`, `goal.html`：專案相關資訊頁面，導覽列一致性良好。

2. **CSS 樣式系統**：
   - 採用 **Bootstrap 5.3** 網格系統 (`css/bootstrap.min.css`)。
   - 遵照 `DESIGN.md` 所定義之 `:root` 原生 CSS 自訂變數 (`--primary: #2f6fed;`, `--ink: #0f172a;`, `--bg-body: #f8fafc;`)。
   - 自訂樣式採內嵌 `<style>` 方式置於 `soundsync.html` 標頭中，元件風格包含毛玻璃卡片 (`.glass-card`)、圓角膠囊按鈕 (`.btn-primary-custom`)、拖曳上傳區 (`.drop-zone`)、時間軸項目 (`.lyric-line-item`) 與時間標籤 (`.time-badge`)。

3. **JS 模組結構**：
   - 目前 `js/` 目錄下僅含有 Bootstrap 官方腳本 (`bootstrap.bundle.min.js` 等)。
   - **SoundSync AI 的所有業務邏輯目前皆集中寫於 `soundsync.html` 內部的單一 `<script>` 區塊中**（約 230 行 JS 程式碼），尚未模組化拆分至獨立 JS 檔案。

---

## 3. 現有前端 UI 元件細項勘查 (Detailed Component Survey)

### 3.1 頂部 Hero 與 API Key 設定區
- **導覽列**：硬質黑底 Navbar，具備 SoundSync AI 旗艦版標籤與跨頁連結。
- **Hero 簡介區**：顯示自研 AI 聲樂對齊引擎說明。
- **API Key 設置控制項**：
  - 輸入框 `#apiKeyInput` (密碼型別)
  - 儲存按鈕 `#saveKeyBtn`
  - 狀態提示 `#keyStatusMsg`
  - 持久化機制：使用 `localStorage.setItem("soundsync_gemini_key", val)`。

### 3.2 步驟 1：音訊上傳與參考歌詞區 (左欄 `.col-lg-6`)
- **拖曳與選擇上傳區塊 (`.drop-zone`)**：
  - 隱藏式檔案輸入框 `<input type="file" id="audioFileInput" style="display:none !important;">`。
  - 點擊觸發 `handleAudioFile(file)`。
  - 支援拖曳事件監聽 (`dragenter`, `dragover`, `dragleave`, `drop`)。
- **音訊播放器控制區 (`#audioPlayerContainer`)**：
  - 標題與檔名顯示 `#audioFileName`
  - 時長標籤 `#audioDuration`
  - 原生 HTML5 音訊播放器 `<audio id="audioPlayer" controls class="w-100">`
- **參考歌詞輸入框 (`#lyricsInput`)**：
  - 多行文本框 `<textarea id="lyricsInput" rows="6">`，供使用者貼上純文字歌詞。
- **執行對齊按鈕 (`#startSyncBtn`)與進度指示 (`#syncProgressMsg`)**：
  - 具體呈現轉圈動畫與模型調用狀態文字 `#syncProgressText`。

### 3.3 步驟 2：時間軸預覽與即時提詞區 (右欄 `.col-lg-6`)
- **狀態標籤 (`#resultCountBadge`)**：顯示已對齊句數。
- **時間軸提詞顯示器 (`#timelineContainer`)**：
  - 動態生成 `.lyric-line-item` 元件。
  - 包含時間碼徽章 `.time-badge` (例如 `00:00:01.200 ➔ 00:00:04.500`) 與歌詞內文 `.lyric-text`。
  - 點擊字幕行自動跳轉音訊播放點 (`audioPlayer.currentTime = s`) 並自動播放。
  - 監聽 `audioPlayer` 之 `timeupdate` 事件，動態高亮目前播放行 (`.active-line`) 並調用 `scrollIntoView({ behavior: "smooth", block: "nearest" })` 自動捲動。
- **多格式字幕匯出控制區**：
  - `#exportSrtBtn`：下載 SubRip (.SRT) 字幕檔。
  - `#exportLrcBtn`：下載 LRC 歌詞檔 (.LRC)。
  - `#exportVttBtn`：下載 WebVTT (.VTT) 字幕檔。
  - `#exportTxtBtn`：複製帶時間碼之純文字至剪貼簿。

---

## 4. 需求對應程度與缺口評估矩陣 (R1/R2/R3 Requirement Mapping & Gap Analysis)

| 需求項目 | 規範細節 (ORIGINAL_REQUEST.md) | 現有程式碼實作狀況 | 對應程度 | 關鍵缺口與問題描述 (Gaps & Issues) | 嚴重度 |
|---|---|---|---|---|---|
| **R1. 音訊選擇與重採樣 (Fail-Safe Audio Selection & Resampling)** | 1. 支援 Windows/Mac 瀏覽器選擇或拖曳 MP3, WAV, M4A, OGG, FLAC，無視檔名/MIME阻擋。<br>2. **提供 WebAudio 16kHz Mono 重採樣流水線**，清理人聲軌後才傳送至 Gemini API。 | - 已實作拖曳與點擊上傳。<br>- 使用 `URL.createObjectURL(file)` 供 `<audio>` 播放。<br>- 使用 `FileReader.readAsDataURL(file)` 將全檔轉為 Base64。 | ⚠️ 部分符合 (50%) | 1. **嚴重缺乏 WebAudio 16kHz Mono 重採樣流水線 (Resampling Pipeline)**：目前直接將原始檔案整檔轉 Base64 傳給 API。若檔案超過 10MB，易造成 Base64 載荷過大、瀏覽器卡頓或 API 請求失敗。<br>2. `<input type="file">` 缺少 `accept="audio/*,video/*,.mp3,.wav,.m4a,.ogg,.flac"` 屬性。<br>3. 拖曳提示未標明 FLAC 格式。 | 🔴 高 (High) |
| **R2. 官方 Gemini 2.0 Flash REST API 整合與自動降級 (Gemini Integration & Fallback)** | 1. 介接官方 `gemini-2.0-flash` 端點與次級相容模型自動降級。<br>2. 解析參考歌詞文本以確保 100% 精準。<br>3. 強制回傳帶微秒時間戳之 JSON 格式。 | - 已整合 Gemini REST API。<br>- 已設置降級備用模型陣列 (`gemini-2.0-flash`, `gemini-2.0-flash-exp`, `gemini-1.5-flash-latest`, `gemini-1.5-flash-8b`)。<br>- 提示詞內已支援參考歌詞傳入。<br>- 具備繁體中文錯誤轉譯 (`getFriendlyChineseError`)。 | ⚠️ 部分符合 (80%) | 1. **JSON 輸出未啟用強約束**：目前僅靠 Prompt 提示詞要求與 Regex 正則清理外殼 ````json``` `，未設定 API `generationConfig.responseMimeType = "application/json"`。<br>2. **JavaScript 作用域 Bug**：`getFriendlyChineseError` 函式被宣告在 `try` 區塊內部（第 443 行），可能導致 `catch` 區塊調用時發生 `ReferenceError`。<br>3. 無音訊重採樣後的 PCM 壓縮轉換處理。 | 🟡 中 (Medium) |
| **R3. 時間軸邊界重疊修復、提詞與多格式匯出 (Overlap Eraser, Teleprompter & Export)** | 1. 微秒級重疊修正演算法 ($end_i < start_{i+1}$)。<br>2. 音訊播放動態滾動提詞機。<br>3. 一鍵下載 .SRT, .LRC, .VTT 及複製文字。 | - 已實作 `fixSubtitleOverlaps()` 修正重疊。<br>- 已實作 `timeupdate` 高亮與 `scrollIntoView` 捲動。<br>- 已實作 SRT, LRC, VTT 下載與 TXT 剪貼簿複製。 | ⚠️ 部分符合 (75%) | 1. **缺少字幕即時編輯區 (Subtitle Editor)**：目前時間軸顯示區為唯讀文字 (`<span class="lyric-text">`)，使用者無法在 UI 上直接修改字幕文字或微調時間碼。<br>2. **SRT 時間格式邊界邊緣 Bug**：`sub.start.replace(".", ",")` 未強制補齊 3 位毫秒（如 `00:00:01.2` 會變成非標準的 `00:00:01,2`）。<br>3. **LRC 時間轉換極限邊界漏洞**：`parseSeconds` 與 `exportLrcBtn` 假設時間格式為 3 段 `HH:MM:SS.mmm`，若回傳為 2 段 `MM:SS.mmm` 計算將出錯。 | 🟡 中 (Medium) |

---

## 5. 重構與優化建議 (Recommendations)

1. **建立 WebAudio 16kHz Mono 重採樣模組 (`js/audio-resampler.js`)**：
   - 利用 `AudioContext.decodeAudioData()` 解碼使用者上傳的任何音訊/視訊檔。
   - 使用 `OfflineAudioContext(1, sampleRate * duration, 16000)` 將音訊重採樣為 **16kHz 單聲道 (16kHz Mono)**。
   - 將重採樣後的 PCM 音訊編碼為輕量 WAV 檔並轉換為 Base64。此舉可大幅降低 payload 體積（10MB 音訊降至 ~1-2MB），顯著提升 Gemini API 回應速度與穩定度。

2. **修正 Gemini API 請求參數與 JS 作用域漏洞 (`js/gemini-api.js`)**：
   - 在 REST API 請求的 `generationConfig` 中加入 `"response_mime_type": "application/json"`，確保 Gemini 回傳 100% 合法 JSON。
   - 將 `getFriendlyChineseError` 抽離至全域或模組作用域，解決 `try...catch` 內部作用域陷阱。

3. **實作字幕線上雙向編輯與嚴謹時間戳格式化 (`js/subtitle-editor.js`)**：
   - 為 `#timelineContainer` 中的字幕項目增加可編輯欄位（可編輯文字與微調時間戳）。
   - 重構 `.SRT`、`.LRC`、`.VTT` 導出邏輯，統一採用 `HH:MM:SS.mmm` 秒數解析與補零函式，確保 100% 格式規範。

4. **模組化拆分與檔名架構優化**：
   - 將 `soundsync.html` 中的內嵌腳本拆分為：
     - `js/soundsync-resampler.js` (R1 音訊處理)
     - `js/soundsync-gemini.js` (R2 API 調用與降級)
     - `js/soundsync-exporter.js` (R3 時間軸修復、編輯與匯出)
     - `js/soundsync-ui.js` (UI 互動與提詞機)

---

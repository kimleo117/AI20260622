# Handoff Report — Milestone 1 (Fail-Safe Audio File Selection & WebAudio 16kHz Mono Resampling Pipeline)

**建立者**: `m1_explorer_1` (Explorer Agent)  
**對象**: Orchestrator Agent (`orchestrator`) / Implementer Agent (`m1_implementer_1`)  
**時間**: 2026-08-10  
**語言**: 100% 台灣繁體中文 (Traditional Chinese - Taiwan)

---

## 1. 觀察 (Observation)

1. **專案目標與規範 (`PROJECT.md`)**:
   - 第 14 行: `Native File Picker & D&D` (Milestone 1, R1)。
   - 第 15 行: `Audio Title & Duration Player UI` (Milestone 1, R1)。
   - 第 16 行: `WebAudio 16kHz Mono Resampling Pipeline` (Milestone 1, R1)。
   - 第 57 行: `js/audio-resampler.js` 定義為 WebAudio 16kHz Mono PCM WAV 重取樣獨立模組。
   - 第 40-44 行: 介面契約規定 `AudioResampler` 輸入為 `File` 物件，輸出為 `Promise<{ wavBase64: string, sampleRate: number, duration: number, audioBuffer: AudioBuffer }>`，異常時拋出 Traditional Chinese `AudioDecodeError`。

2. **現有 HTML 程式碼 (`soundsync.html`)**:
   - 第 157 行: `<input type="file" id="audioFileInput" style="display:none !important;" onchange="if(this.files && this.files.length>0) handleAudioFile(this.files[0])">`。缺少明確副檔名過濾 `accept`，導致 Windows Chrome/Edge 易遭 MIME 映射阻擋。
   - 第 238-268 行: `handleAudioFile(file)` 函式直接將音訊檔經由 `FileReader.readAsDataURL(file)` 轉為原始 Base64，未進行下採樣至 16kHz Mono WAV，且每次執行 `URL.createObjectURL(file)` 均未釋放前一次的 ObjectURL (第 251 行)。
   - 第 270-289 行: 僅於 `.drop-zone` 上設置拖曳事件，全域 `window` 未攔截 `dragover` 與 `drop`，拖曳於 Dropzone 外釋放檔案時會觸發瀏覽器開檔跳轉。

3. **專案目錄結構 (`list_dir C:\外掛\影像\workspace\AI20260622-main\js`)**:
   - 目前 `js/` 目錄僅包含 Bootstrap 相關檔案，尚無 `audio-resampler.js` 或單元測試架構。

---

## 2. 邏輯鏈 (Logic Chain)

1. **從觀察 1 至重取樣模組需求**: `PROJECT.md` 規範 Gemini API Payload 應使用 16kHz Mono 16-bit PCM WAV。目前的 `soundsync.html` 傳送原始大檔 Base64 (如 44.1kHz / 48kHz 立體聲 MP3)，除了發送過多無用封包外，亦缺乏獨立轉碼機制。故必須抽離出 `js/audio-resampler.js`。
2. **從觀察 1 頁面載入至演算法選擇**: WebAudio 原生 `OfflineAudioContext` 可以在瀏覽器記憶體中快速將多聲道音訊混合並下採樣至 16000 Hz。搭配 ArrayBuffer 構建 44-byte RIFF WAV 檔頭與 Float32 至 Int16 的 16-bit PCM 量化，能在無第三方大庫依賴的情況下達到最輕量與毫秒級轉換。
3. **從觀察 2 至檔案選取 Fail-Safe 重構**: Windows 平台容易對 `.m4a` / `.flac` 進行 MIME 過濾，將 `input[type=file]` 的 `accept` 屬性擴充為顯式包含 `.mp3,.wav,.m4a,.ogg,.flac,.aac` 與 `audio/*,video/*` 可防止檔案選取器隱藏有效音訊。
4. **從觀察 2 至全域拖曳攔截**: 在 `window` 層級關閉 `dragover` 與 `drop` 預設行為，可徹底保護 DOM 頁面不因使用者手滑拖曳落點偏離 Dropzone 而跳轉。
5. **從觀察 2 至記憶體優化**: 在 `handleAudioFileSelect` 中加入 `URL.revokeObjectURL(activeObjectUrl)` 可確保連續上傳時記憶體不會持續暴增。

---

## 3. 顧慮與假設 (Caveats)

1. **瀏覽器 WebAudio 自動播放與安全限制**: 某些瀏覽器版本可能要求在使用者有過首頁點擊互動後才允許初始化 `AudioContext`。由於檔案選擇或拖曳本身即為使用者觸發之互動事件，因此在此階段建立 `AudioContext` 可順利通過瀏覽器安全政策。
2. **極大檔案記憶體限制**: 若使用者上傳超過 200MB 之超大音訊檔，`decodeAudioData` 佔用的解碼記憶體可能達到數百 MB。若遇此類極端情況，需提示 Traditional Chinese 錯誤或建議先剪輯音訊。
3. **沒有其他未調查之隱患**: 本研析已完整覆蓋 `soundsync.html` 現況、WebAudio 轉碼規格與測試驗證規範。

---

## 4. 結論 (Conclusion)

Milestone 1 的架構研析與實作規劃已 100% 完成。
1. `js/audio-resampler.js` 可透過原生 WebAudio API (`AudioContext` + `OfflineAudioContext`) + PCM 16-bit 轉碼純 JS 演算法實現，完全獨立且易於單元測試。
2. `soundsync.html` 的重構方案可完美達成 Fail-Safe 上傳、全頁面防跳轉拖曳、Unicode 檔名顯示安全與記憶體自動釋放。
3. 詳細實作步驟指南與驗證點已撰寫於 `analysis.md`。

---

## 5. 驗證方法 (Verification Method)

實作完成後，可經由以下步驟進行獨立驗證：

1. **檔案檢視驗證**:
   - 確認 `js/audio-resampler.js` 檔案存在且語法正確。
   - 確認 `soundsync.html` 成功引用 `<script src="js/audio-resampler.js"></script>`。

2. **UI 互動與 Fail-Safe 測試**:
   - 於 Windows 瀏覽器開啟 `soundsync.html`，點擊 Dropzone 上傳中文檔名音訊檔（例如：`聽媽媽的話.m4a`）。
   - 驗證 `<audio>` 播放器顯示正確檔名且能正常播放。
   - 拖曳一個檔案落於 Dropzone 外圍（如頁面 Header），確認頁面不會跳轉或轉址。

3. **轉碼品質驗證**:
   - 於瀏覽器 Console 執行 `AudioResampler.resample(file)`。
   - 檢查回傳結果：`result.sampleRate === 16000`、`result.channels === 1`、`result.wavBase64` 字串開頭對應 RIFF 表頭 Base64 編碼（`UklGR...`）。

# Milestone 1 變更紀錄 (Changes Log)

**實作人員**: Implementer Agent (`m1_worker_1`)  
**專案名稱**: SoundSync AI  
**里程碑**: Milestone 1 — Fail-Safe Audio File Selection & WebAudio 16kHz Mono Resampling Pipeline  
**日期**: 2026-08-10  

---

## 修改與新增檔案清單

### 1. `js/audio-resampler.js` (新增核心模組)
- **目的**: 實作原生 WebAudio 16kHz 16-bit Mono WAV 重採樣管道與 44-byte RIFF/WAV 表頭編碼器。
- **具體變更**:
  - 實作自訂例外類別 `AudioDecodeError`，繼承自原生 `Error`，提供 100% 繁體中文錯誤資訊。
  - 實作 `AudioResampler` 類別，提供 `resample(input)` 與 `encodeWAV(audioBuffer)` 靜態方法。
  - 實作 Float32 至 Int16 PCM 之數值量化與裁切 (Clamp) 邏輯，並寫入標準 44 位元組 RIFF/WAV 表頭 (Sample Rate: 16000Hz, Channels: 1, BitsPerSample: 16)。
  - 導出 `resampleAudioTo16kMonoWav(input)` 獨立非同步介面，並同時相容 CommonJS (`module.exports`) 與瀏覽器全域變數 (`window`)。

### 2. `soundsync.html` (重構主 UI 與邏輯)
- **目的**: 升級原生檔案選取器、全頁面防拖曳跳轉、0-byte / 損毀檔警告彈窗與記憶體釋放機制。
- **具體變更**:
  - 擴充 `<input type="file" id="audioFileInput">` 之 `accept` 屬性，顯式包含 Windows 上常見音訊與影片副檔名 (`.mp3,.wav,.m4a,.ogg,.flac,.aac,.wma,.webm,.mp4,.mkv,.mov`) 與寬鬆 MIME 類型。
  - 導入 `<script src="js/audio-resampler.js"></script>`。
  - 實作全域 `window` 之 `dragover` / `drop` `preventDefault()` 與 `stopPropagation()` 攔截，防止使用者拖曳音訊檔至 Dropzone 外部時引發瀏覽器頁面跳轉。
  - 實作 `validateAudioFile(file)`，加入 0-byte (容量為 0) 與無效副檔名 / 損毀檔前置驗證，彈出 100% 台灣繁體中文警示 Modal/Alert。
  - 實作 `URL.revokeObjectURL(activeObjectUrl)` 記憶體自動釋放機制，切換檔案時自動清理前次佔用之 Blob URL。
  - 以 `audioFileName.textContent` 及 `innerText` 安全更新 DOM 檔名，防止 HTML 注入。
  - 修正原 HTML script 中多行字串語法錯誤 (Literal Newline in Double Quotes)，修復 `parseSeconds` 以正確解析 `MM:SS.mmm` 格式。

### 3. `tests/helpers/dom_simulator.js` (測試輔助環境增強)
- **目的**: 支援外部 script 檔案讀取、WebAudio API Mock 以及 DOM 元素屬性同步。
- **具體變更**:
  - 擴充正則運算式，自動解析 HTML 中的 `<script src="...">` 並載入對應之 JS 檔案 (`js/audio-resampler.js`)。
  - 於 `MockElement` 加入 `textContent` getter/setter，自動同步 `innerText`。
  - 補全 `MockAudioContext` 與 `MockOfflineAudioContext` WebAudio 模擬器。

### 4. `tests/audio_resampler.test.js` (新增單元測試套件)
- **目的**: 驗證 `AudioResampler` 模組之轉碼、表頭編碼與例外處置。
- **具體變更**:
  - 撰寫 5 項獨立單元測試 (`AR-01` 至 `AR-05`)，涵蓋 `AudioDecodeError` 實例、44-byte RIFF WAV 表頭位元組結構、0-byte 檔案拒絕與 16kHz 單聲道重採樣輸出。

---

## 建置與測試驗證結果
- **測試命令**: `node -e "async function runAll() { await require('./tests/audio_resampler.test.js').run(); await require('./tests/tier1_functional/tier1_f01_f05.test.js').run(); await require('./tests/tier1_functional/tier1_f06_f10.test.js').run(); } runAll();"`
- **測試結果**: 55 測試全部通過 (`55 / 55 PASS`)，Console 零錯誤與零未捕捉例外。

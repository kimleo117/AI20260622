## 2026-08-09T17:16:06Z
你的工作目錄是 `C:\外掛\影像\workspace\AI20260622-main\.agents\m1_worker_1`。
專案根目錄為 `C:\外掛\影像\workspace\AI20260622-main`。
請閱讀 `C:\外掛\影像\workspace\AI20260622-main\.agents\ORIGINAL_REQUEST.md` 以及 `C:\外掛\影像\workspace\AI20260622-main\PROJECT.md`。
同時參考 `C:\外掛\影像\workspace\AI20260622-main\.agents\m1_explorer_1\analysis.md` 與 `C:\外掛\影像\workspace\AI20260622-main\.agents\m1_explorer_2\analysis.md` 中的探索報告與步驟。

【任務內容】：實作 Milestone 1 — Fail-Safe Audio File Selection & WebAudio 16kHz Mono Resampling Pipeline
1. 建立 `js/audio-resampler.js`：
   - 實作原生 WebAudio 16kHz 16-bit Mono WAV 重採樣管道 (`AudioContext` + `OfflineAudioContext`)。
   - 實作 RIFF/WAV 44-byte 標頭編碼器與 Float32 至 Int16 PCM 量化函數。
   - 導出 `AudioResampler` 類別與 `resampleAudioTo16kMonoWav(file)` 介面。
   - 實作完整 `AudioDecodeError` 自訂例外處理機制。
2. 重構 `soundsync.html` 音訊選取與 UI 播放器邏輯：
   - 擴充選取器 `accept` 屬性支援包含 Windows 上各類音訊/影片副檔名（MP3, WAV, M4A, OGG, FLAC, AAC, WMA 等）。
   - 實作拖曳上傳與檔名安全顯示 (`textContent`)，加入 `window` 全域 `dragover` / `drop` 防跳轉機制。
   - 加入 0-byte 檔與損毀檔預警彈窗 (100% 台灣繁體中文提示)。
   - 實作 `URL.revokeObjectURL` 記憶體自動釋放與 `<audio>` 播放器狀態同步。
3. 執行語法與單元測試驗證，確保無任何 JavaScript Console Error 或未補捉例外。
4. 撰寫 `changes.md` 與 `handoff.md` 於你的工作目錄中。

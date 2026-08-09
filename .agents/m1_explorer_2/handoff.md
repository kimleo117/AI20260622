# Handoff Report — Milestone 1 UI 控制與音訊播放器 UI 更新機制研析

## 1. Observation (直接觀察)

1. **`soundsync.html` 原始碼觀察 (第 162-168 行, 第 238-268 行)**：
   - 音訊播放器容器 `#audioPlayerContainer` 預設隱藏 (`display:none`)。
   - `handleAudioFile(file)` 僅使用 `document.getElementById("audioFileName").innerText = file.name` 與 `Math.floor(audioPlayer.duration)` 進行簡易賦值。
   - 未包含波形圖渲染 Canvas、未提供 16kHz 重採樣解碼中骨架屏 (Skeleton Screen)。
   - 未掛載 `<audio>` 之 `onerror` 事件監聽器，亦未傳入 `file.size` 防呆過濾邏輯。
2. **`PROJECT.md` 規範觀察 (Feature Inventory #2, 介面合約)**：
   - M1 特性需求：Native File Picker & D&D、Audio Title & Duration Player UI。
   - 音訊解碼失敗時必須拋出/呈現 Traditional Chinese 訊息 Modal 彈窗。
3. **`DESIGN.md` 設計系統規範**：
   - 品牌主色 `--primary: #2f6fed`，內文色 `--ink: #172033`，按鈕需採圓角膠囊型。
   - 所有錯誤與警告 Modal 必須符合 Bootstrap 5 UI 規範與 100% 繁體中文對話。

---

## 2. Logic Chain (推理鏈)

1. **從 Observation 1 (現行 `soundsync.html` 缺乏狀態機與防呆)**：
   - 當使用者上傳 0 Byte 檔案、非音訊檔（如 `.pdf`）或 >300MB 極大檔時，`URL.createObjectURL` 雖然可生成 URL，但 `<audio>` 解碼必將觸發失敗，且頁面無任何錯誤提示，導致使用者困惑或頁面崩潰。
   - **推論**：必須在音訊選取第一時間點引入 `validateAudioFile(file)` 驗證器，並掛載全域彈窗警告機制。

2. **從 Observation 1 & 3 (現行缺少載入動畫與波形畫布)**：
   - 音訊檔在發送給 Gemini API 前需經由 WebAudio `OfflineAudioContext` 重採樣解碼，此過程在瀏覽器端需耗時 1~3 秒。若無視覺反饋，使用者可能重複點擊或誤以為死機。
   - **推論**：應設計 5 大狀態切換 (`IDLE` -> `LOADING_DECODING` -> `LOADED_READY` -> `PLAYING` -> `ERROR`)，並提供動態 Skeleton Bar 與基於 WebAudio `AudioBuffer` 畫布渲染的 `renderAudioWaveform()`。

3. **從 Observation 2 (單元測試與端到端測試驅動品質)**：
   - 為了維護 Milestone 1 交付品質，必須建立可量化測試的單元測試集 (`UT-M1-01` 至 `UT-M1-06`)，涵蓋 0-byte 檔案、格式過濾、時間格式化 (`HH:MM:SS`)、檔名截斷與 error 重置。

---

## 3. Caveats (限制與注意事項)

- **瀏覽器記憶體限制**：儘管實作中加入 >300MB 超大檔案拒絕機制，不同使用者設備之 RAM 狀況不同；WebAudio 在低配備行動裝置上處理 >100MB 檔案仍有極低機率觸發 OOM。建議維護人員未來可考量分段串流 (Chunk Decoding)。
- **Windows 上 MIME Type 為空之狀況**：Windows 部分副檔名（如 `.flac`, `.m4a`）的原生 `file.type` 可能為空字串，故驗證 logic 必須以「副檔名 + WebAudio Decode Fallback」雙重認證，不可僅依賴 `file.type`。

---

## 4. Conclusion (結論與建議)

- **最終評估**：M1 的 UI 控制與音訊播放器 UI 更新機制已具備完整且結構嚴密之技術研析藍圖（參見 `analysis.md`）。
- **關鍵產出**：
  1. 定義 `AudioPlayerUI` 狀態機與 5 大狀態管理。
  2. 設計 0 Byte 損毀檔、不支援副檔名、>300MB 超大檔之 100% 繁體中文警告 Modal 彈窗範本。
  3. 提供 HTML5 Canvas 波形圖與 CSS Pulse 載入動畫繪製邏輯。
  4. 規劃 `UT-M1-01` 至 `UT-M1-06` 測試套件。
- **可執行動作**：後續 Implementer 即可依據 `analysis.md` 建立 `js/audio-player-ui.js` 並升級 `soundsync.html`。

---

## 5. Verification Method (獨立驗證方法)

1. **檔案檢查**：
   - 檢視 `C:\外掛\影像\workspace\AI20260622-main\.agents\m1_explorer_2\analysis.md` 內容是否涵蓋 5 大 UI 狀態機、0 Byte/極大檔彈窗處置、波形/載入動畫與單元測試規範。
2. **驗證條件**：
   - 報告 100% 使用台灣繁體中文 (Traditional Chinese - Taiwan)。
   - 無未寫明檔名/行號之模糊描述。

# Milestone 1: UI 控制與音訊播放器 UI 更新機制研析報告 (Analysis Report)

## 摘要 (Executive Summary)

本報告針對 **SoundSync AI** 專案 Milestone 1 (M1) 之「UI 控制與音訊播放器 UI 更新機制」進行深度的技術研析與模組設計。主要解決音訊檔案載入、播放器 UI 狀態更新、視覺化波形/載入中動畫呈現，以及各種極限邊界條件（0 位元組損毀檔、無效格式、極大檔案）之 UI 彈窗警示與防呆復原機制。

---

## 1. 現有 HTML/JS 現況評估與問題診斷 (Current State Analysis)

研析現有 `soundsync.html` 內嵌指令碼，發現以下主要問題與改進空間：

| 評估項目 | 現行實作狀態 | 潛在問題與風險 | 建議改進方案 |
| :--- | :--- | :--- | :--- |
| **播放器 UI 狀態管理** | 僅透過 `audioPlayerContainer.style.display = "block"` 控制顯隱。 | 無法區分「載入中」、「解碼中」、「已載入」、「播放中」或「錯誤」狀態。 | 建立 `AudioPlayerUI` 狀態機 (State Machine)，集中管理 5 大 UI 狀態。 |
| **檔名與時間長度顯示** | 直接寫入 `file.name` 與 `Math.floor(duration)` 轉 `MM:SS`。 | 長檔名會擠壓排版；缺少大於 1 小時之 `HH:MM:SS` 格式化；無音訊解碼失敗時之備援機制。 | 提供 `truncateFileName()` 與通用的 `formatTime()` 函數；新增 tooltip 顯示完整檔名。 |
| **載入中與波形視覺化** | 僅有文字日誌與純 HTML5 `<audio>` 控制條，無視覺化波形與動畫。 | 使用者在 WebAudio 重採樣/解碼期間（2~5 秒）無法感知系統進度，體驗較差。 | 新增 CSS 波形動態載入動畫（Skeleton Bar Pulse）與基於 WebAudio `AudioBuffer` 的 Canvas 靜態/動態波形畫布。 |
| **極限邊界與防呆處理** | 直接使用 `URL.createObjectURL(file)`，完全無檔案大小或 0 Byte 判斷。 | 選取 0 Byte 檔案或極大檔案 (如 500MB+) 時，瀏覽器會直接靜默失敗或記憶體崩潰 (OOM)。 | 建立 `validateAudioFile(file)` 前置過濾器，配合 100% 繁體中文警告 Modal 彈窗。 |

---

## 2. 音訊播放器 UI 狀態機設計 (UI State Machine Architecture)

為了確保 UI 狀態切換的一致性與可預測性，音訊播放器模組應實現以下狀態轉換邏輯：

```
       ┌──────────┐
       │   IDLE   │ ◄────────────────────────┐
       └────┬─────┘                          │
            │ File Selected                  │
            ▼                                │ Reset / Error
 ┌──────────────────────┐                    │
 │   LOADING_DECODING   │ (顯示載入動畫)      │
 └──────────┬───────────┘                    │
            │ Decoded / Resampled            │
            ▼                                │
  ┌──────────────────┐  File Invalid / Error │
  │   LOADED_READY   ├───────────────────────┤
  └─────────┬────────┘                       │
            │ Play / Pause                   │
            ▼                                │
   ┌────────────────┐                        │
   │ PLAYING/PAUSED ├────────────────────────┘
   └────────────────┘
```

### 5 大核心 UI 狀態規範：

1. **`IDLE` (未上傳狀態)**：
   - Dropzone 上傳區呈現波浪點狀邊框 (`#3b82f6`) 與上傳提示文字。
   - 音訊播放器容器 (`#audioPlayerContainer`) 保持隱藏。
   - 「開始打軸」按鈕停用 (`disabled`) 或警示未選取音訊。

2. **`LOADING_DECODING` (載入/重採樣解碼中)**：
   - Dropzone 區域顯示淡出或停用鎖定。
   - `#audioPlayerContainer` 顯示波形骨架屏 (Skeleton Bar) 與 Bootstrap Spinner。
   - 顯示狀態提示：「`🎵 正在進行 WebAudio 16kHz 重採樣與解碼中...`」。

3. **`LOADED_READY` (載入完成/準備就緒)**：
   - 隱藏 Spinner，顯示標準 `<audio>` 控制列。
   - `#audioFileName` 顯示格式化後之檔名與 `title` Tooltip。
   - `#audioDuration` 顯示精準時間長度（如 `03:45` 或 `01:12:30`）。
   - Canvas 波形畫布完成 Peak Data 繪製。

4. **`PLAYING` / `PAUSED` (播放與暫停中)**：
   - 高亮當前播放進度區塊（Canvas 波形圖隨 `currentTime` 即時渲染高亮覆蓋）。
   - 時間標籤動態更新：`01:23 / 03:45`。

5. **`ERROR` (錯誤與例外狀態)**：
   - 隱藏播放器面板，彈出 100% 台灣繁體中文警示 Modal 彈窗。
   - 自動重置 Dropzone 狀態至 `IDLE`，允許使用者重新選取檔案。

---

## 3. 極限邊界情境研析與 UI 錯誤處置 (Edge Cases & Fault Tolerance)

### 3.1 0 位元組損毀檔案 (0-Byte Corrupt File)
- **觸發情境**：使用者上傳受損或空檔案（`file.size === 0`）。
- **處理邏輯**：在上傳入口處優先檢查，拒絕執行 `createObjectURL` 或 `FileReader`。
- **UI 彈窗體驗**：
  ```html
  <div class="modal fade" id="audioAlertModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content border-0 shadow-lg rounded-4">
        <div class="modal-header bg-danger text-white border-0 rounded-top-4">
          <h5 class="modal-title fw-bold">⚠️ 音訊檔案損毀警示</h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body p-4">
          <p class="mb-2 text-dark font-bold">您選取的檔案 <span id="errFileName" class="text-danger">example.mp3</span> 容量為 0 位元組 (0 Bytes)。</p>
          <p class="text-muted small mb-0">該檔案內容已損毀或為空白檔，無法進行解碼與播放。請選擇有效的音訊檔案再試一次。</p>
        </div>
        <div class="modal-footer border-0">
          <button type="button" class="btn btn-secondary rounded-pill px-4" data-bs-dismiss="modal">我知道了</button>
        </div>
      </div>
    </div>
  </div>
  ```

### 3.2 非音訊檔案 / 不支援格式 (Non-Audio or Unsupported File)
- **觸發情境**：使用者選取 `.pdf`, `.exe`, `.txt` 或編碼不相容之音訊檔。
- **判斷機制**：
  1. 雙重副檔名檢查：`.mp3, .wav, .m4a, .ogg, .flac, .aac, .mp4, .webm, .wma`。
  2. `<audio>` 原生 `onerror` 事件監聽 (如 `MEDIA_ERR_SRC_NOT_SUPPORTED`)。
  3. WebAudio `decodeAudioData` Promise catch 攔截。
- **UI 彈窗體驗**：
  - 提示訊息：「`⚠️ 檔案格式不支援：您選取的檔案 [.pdf] 不是有效的音訊或影片格式。SoundSync AI 支援 MP3, WAV, M4A, OGG, FLAC, AAC, MP4 等格式。`」

### 3.3 極大檔案容量警告與處置 (Extremely Large File, > 150MB ~ 300MB+)
- **觸發情境**：長達 2~3 小時之 Podcast 或無損音訊檔（容量 > 150MB）。
- **記憶體風險**：WebAudio `decodeAudioData` 解碼為 PCM Float32 後，記憶體消耗約為原壓縮檔之 5~10 倍。300MB 檔案可能佔用 2GB+ 記憶體造成頁面崩潰。
- **分級處置機制**：
  - **軟警告 (150MB ~ 300MB)**：彈出溫馨提示 Modal：「`⚠️ 大容量音訊解碼提示：您上傳的檔案容量較大 (180 MB)，音訊重採樣與解析可能需要 5-15 秒，請耐心等待。`」，允許使用者選擇繼續或取消。
  - **硬拒絕 (> 300MB)**：拒絕直接解碼，提示：「`⚠️ 檔案超出安全容量上限：為了防止瀏覽器記憶體不足崩潰，單一檔案上限為 300MB。建議先將音訊進行剪輯或轉為標準 MP3 格式後上傳。`」。

### 3.4 Windows 原生檔案選擇器 fail-safe
- **HTML 屬性優化**：
  ```html
  <input type="file" id="audioFileInput" 
         accept="audio/*,video/*,.mp3,.wav,.m4a,.ogg,.flac,.aac,.wma,.mp4,.webm,.mkv" 
         style="display:none !important;">
  ```

---

## 4. 波形視覺化與載入動畫實作設計 (Waveform & Loading Animation Design)

### 4.1 HTML5 Canvas 音訊波形繪製器 (`renderWaveform`)
在 `js/audio-player-ui.js` 中實現高效能波形繪製：

```javascript
function renderAudioWaveform(audioBuffer, canvas) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const data = audioBuffer.getChannelData(0);
  const step = Math.ceil(data.length / width);
  const amp = height / 2;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#2f6fed"; // CSS var(--primary)

  for (let i = 0; i < width; i += 3) {
    let min = 1.0;
    let max = -1.0;
    for (let j = 0; j < step; j++) {
      const datum = data[i * step + j];
      if (datum < min) min = datum;
      if (datum > max) max = datum;
    }
    const barHeight = Math.max(2, (max - min) * amp);
    ctx.fillRect(i, amp - barHeight / 2, 2, barHeight);
  }
}
```

### 4.2 CSS 波形脈衝載入動畫 (Skeleton Pulse)
當處於 `LOADING_DECODING` 狀態時呈現：

```css
.waveform-skeleton {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 40px;
}
.waveform-skeleton .bar {
  flex: 1;
  background: #cbd5e1;
  height: 20%;
  border-radius: 2px;
  animation: pulseBar 1.2s infinite ease-in-out;
}
.waveform-skeleton .bar:nth-child(2n) { animation-delay: 0.2s; }
.waveform-skeleton .bar:nth-child(3n) { animation-delay: 0.4s; }

@keyframes pulseBar {
  0%, 100% { height: 20%; background: #cbd5e1; }
  50% { height: 90%; background: #2f6fed; }
}
```

---

## 5. 模組化實作指南 (Implementation Guide)

建議建立獨立模組 `js/audio-player-ui.js`，包含通用的 UI 控制類別與驗證器：

```javascript
/**
 * SoundSync AI - 音訊播放器 UI 管理模組
 */
class AudioPlayerUI {
  constructor(options) {
    this.container = document.getElementById(options.containerId);
    this.audioElement = document.getElementById(options.audioPlayerId);
    this.fileNameEl = document.getElementById(options.fileNameId);
    this.durationEl = document.getElementById(options.durationId);
    this.canvasEl = document.getElementById(options.canvasId);
    this.currentState = "IDLE";
  }

  // 前置檔案驗證器
  validateFile(file) {
    if (!file) return { valid: false, error: "NO_FILE" };
    
    // 1. 0 Byte 判斷
    if (file.size === 0) {
      return { 
        valid: false, 
        code: "ZERO_BYTE",
        title: "⚠️ 音訊檔案損毀警示", 
        message: `檔案 [${file.name}] 容量為 0 位元組 (0 Bytes)，檔案已損毀。` 
      };
    }

    // 2. 超大容量判斷 (> 300MB)
    const MAX_SIZE = 300 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return { 
        valid: false, 
        code: "FILE_TOO_LARGE",
        title: "⚠️ 檔案超出安全容量限制", 
        message: `檔案容量 (${(file.size / (1024*1024)).toFixed(1)} MB) 超出 300MB 安全限制。` 
      };
    }

    // 3. 副檔名檢查
    const ext = file.name.split('.').pop().toLowerCase();
    const validExts = ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac', 'wma', 'mp4', 'webm', 'mkv'];
    if (!validExts.includes(ext)) {
      return {
        valid: false,
        code: "INVALID_FORMAT",
        title: "⚠️ 不支援的檔案格式",
        message: `檔案格式 [.${ext}] 不是有效的音訊或影片格式。`
      };
    }

    return { valid: true };
  }

  // 時間格式化公用函數 (HH:MM:SS 或 MM:SS)
  formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // 檔名截斷顯示 (超過 30 字元顯示省略符號)
  truncateFileName(name, maxLength = 30) {
    if (name.length <= maxLength) return name;
    const extIdx = name.lastIndexOf('.');
    if (extIdx === -1) return name.substring(0, maxLength) + '...';
    const ext = name.substring(extIdx);
    const base = name.substring(0, extIdx);
    return base.substring(0, maxLength - ext.length - 3) + '...' + ext;
  }
}
```

---

## 6. 單元測試與端到端測試建議 (Unit & E2E Test Suite Specifications)

為確保 M1 UI 與音訊播放器控制達到 100% 品質，建議在 `tests/` 目錄中規劃以下測試案例：

### 6.1 測試架構與案例清單

| 測試類別 | 測試案例 ID | 測試說明 (Test Purpose) | 預期結果 (Expected Outcome) |
| :--- | :--- | :--- | :--- |
| **檔案驗證測試** | `UT-M1-01` | 傳入 `file.size = 0` 之 Dummy File 至 `validateFile()` | 回傳 `valid: false`, `code: "ZERO_BYTE"` 並包含繁體中文錯誤訊息。 |
| **檔案驗證測試** | `UT-M1-02` | 傳入無效副檔名檔案 (`test.pdf`, `script.sh`) | 回傳 `valid: false`, `code: "INVALID_FORMAT"`。 |
| **檔案驗證測試** | `UT-M1-03` | 傳入 350MB 超大檔案 | 回傳 `valid: false`, `code: "FILE_TOO_LARGE"`。 |
| **UI 格式化測試** | `UT-M1-04` | 傳入 `seconds = 3665` 至 `formatTime()` | 正確回傳 `"01:01:05"`。 |
| **UI 格式化測試** | `UT-M1-05` | 傳入長檔名 `super_long_audio_file_name_for_testing_soundsync.mp3` | `truncateFileName()` 輸出長度 $\le 30$ 字元且保留 `.mp3` 副檔名。 |
| **播放器事件測試**| `UT-M1-06` | 模擬 `<audio>` 觸發 `error` 事件 | 自動重置 UI 狀態至 `IDLE` 並呼叫彈窗警告。 |
| **E2E 流程測試** | `E2E-M1-01`| 使用者拖曳有效 MP3 檔案至 Dropzone | `#audioPlayerContainer` 顯示、檔名與時間正確更新，波形畫布完成渲染。 |

---

## 7. 結論與後續執行建議 (Conclusions & Next Steps)

1. **結論**：本研析報告已完整定義音訊播放器 UI 狀態機、5 大邊界防呆處置（0 Byte, 非音訊, 超大檔）、波形視覺化/載入動畫機制與單元測試規範。
2. **對接 Worker 指引**：實作人員應遵循本報告設計之 `AudioPlayerUI` 類別與 Modal 元件架構，擴充 `js/audio-player-ui.js` 並整合進 `soundsync.html`。

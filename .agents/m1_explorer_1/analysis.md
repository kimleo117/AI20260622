# Milestone 1 技術可行性研析與具體實作方案報告
**專案名稱**: SoundSync AI (AI 聲樂對齊與字幕時間軸生成器)  
**目標里程碑**: Milestone 1 (Fail-Safe Audio File Selection & WebAudio 16kHz Mono Resampling Pipeline)  
**撰寫者**: Explorer Agent (`m1_explorer_1`)  
**日期**: 2026-08-10  
**語言規範**: 100% 台灣繁體中文 (Traditional Chinese - Taiwan)

---

## 1. 執行摘要 (Executive Summary)

本報告針對 **SoundSync AI** 的 Milestone 1 核心功能進行深入程式碼研析與系統架構設計。Milestone 1 的主要目標為：
1. **獨立音訊重取樣模組 (`js/audio-resampler.js`)**：利用瀏覽器原生 WebAudio API (`AudioContext` 與 `OfflineAudioContext`)，將使用者上傳的任意格式音訊 (MP3, WAV, M4A, OGG, FLAC 等) 重取樣至 **16kHz、單聲道 (Mono)、16-bit PCM WAV** 格式，並封裝為獨立且可測試的 ES6 / UMD 模組。
2. **Fail-Safe 檔案選取與拖曳機制重構 (`soundsync.html`)**：徹底解決 Windows 平台下常見的原生檔案選取器 MIME 阻擋、副檔名過濾失敗及中文/特殊檔名亂碼問題，優化拖曳區 (Dropzone) 互動體驗與記憶體釋放機制。
3. **高可靠音訊播放器 UI 整合**：實現上傳後即時解析音訊長度 (Duration)、顯示檔名與波形預覽準備，並完整維護與 Milestone 2 (Gemini API 介面) 之資料契約。

---

## 2. 獨立重取樣模組設計 (`js/audio-resampler.js`)

### 2.1 模組架構與介面契約 (Interface Contract)

模組應採用全域 window 物件掛載與 ES6 export 雙重相容架構，確保既可於 `soundsync.html` 直接以 `<script src="js/audio-resampler.js">` 載入，亦可於單元測試環境 (如 Node.js / Vitest / Jest + jsdom) 中被 `import` 引用。

#### 介面定義
```typescript
interface ResampleResult {
  wavBase64: string;      // 純 Base64 字串 (不含 "data:audio/wav;base64," 前綴)
  sampleRate: number;     // 恆定為 16000
  channels: number;       // 恆定為 1 (Mono)
  duration: number;       // 音訊總長度 (秒，浮點數)
  audioBuffer: AudioBuffer; // 重取樣後的 Offline AudioBuffer 實例
  blob: Blob;             // 轉碼後的 audio/wav Blob 實例
}

class AudioDecodeError extends Error {
  constructor(message: string, originalError?: any);
}

class AudioResampler {
  static async resample(fileOrBuffer: File | Blob | ArrayBuffer): Promise<ResampleResult>;
  static encodeWAV(audioBuffer: AudioBuffer): Uint8Array;
}
```

---

### 2.2 WebAudio 重取樣與 16-bit PCM WAV 轉碼演算法

#### 步驟 1：ArrayBuffer 轉碼與音訊解碼
1. 將輸入的 `File` 或 `Blob` 透過 `file.arrayBuffer()` 轉為 `ArrayBuffer`。
2. 為防止 `arrayBuffer` 在 `decodeAudioData` 中被轉移 (Detached)，傳入副本 `arrayBuffer.slice(0)`。
3. 建立臨時 `AudioContext` 進行解碼：
   ```javascript
   const AudioCtx = window.AudioContext || window.webkitAudioContext;
   if (!AudioCtx) {
     throw new AudioDecodeError("您的瀏覽器不支援原生 WebAudio API，請升級瀏覽器。");
   }
   const tempCtx = new AudioCtx();
   let decodedBuffer;
   try {
     decodedBuffer = await new Promise((resolve, reject) => {
       tempCtx.decodeAudioData(
         arrayBufferCopy,
         (buffer) => resolve(buffer),
         (err) => reject(err || new Error("解碼失敗"))
       );
     });
   } catch (err) {
     throw new AudioDecodeError("音訊檔案解析失敗，檔案可能已損毀、受保護或格式不支援。", err);
   } finally {
     if (tempCtx.close) await tempCtx.close();
   }
   ```

#### 步驟 2：OfflineAudioContext 下採樣至 16kHz 單聲道
1. 目標採樣率 (Target Sample Rate): `16000` Hz。
2. 目標聲道數 (Target Channels): `1` (Mono)。
3. 計算總採樣點數: `const totalFrames = Math.ceil(decodedBuffer.duration * 16000);`
4. 實例化 `OfflineAudioContext`：
   ```javascript
   const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
   const offlineCtx = new OfflineCtx(1, totalFrames, 16000);
   
   const source = offlineCtx.createBufferSource();
   source.buffer = decodedBuffer;
   // WebAudio 規範保證：當多聲道來源連接至 1 Channel 的 Offline Context 時，自動進行 Downmix 合併
   source.connect(offlineCtx.destination);
   source.start(0);
   
   const renderedBuffer = await offlineCtx.startRendering();
   ```

#### 步驟 3：Float32 量化為 Int16 PCM 並編碼 44-Byte RIFF WAV 表頭
WebAudio 輸出的 PCM 資料為 `Float32Array`（數值範圍為 `-1.0` 至 `+1.0`）。需要將其量化為 16-bit 有符號整數 (`-32768` 至 `+32767`)，並寫入標準 RIFF/WAV 表頭：

```javascript
// WAV 檔頭 (44 bytes) + PCM 資料 (length * 2 bytes)
const channelData = renderedBuffer.getChannelData(0);
const pcmByteLength = channelData.length * 2;
const buffer = new ArrayBuffer(44 + pcmByteLength);
const view = new DataView(buffer);

// 輔助寫入 ASCII 字串函數
function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/* RIFF 標頭 */
writeString(view, 0, 'RIFF');
view.setUint32(4, 36 + pcmByteLength, true); // 檔案總長度 - 8
writeString(view, 8, 'WAVE');

/* fmt 子區塊 */
writeString(view, 12, 'fmt ');
view.setUint32(16, 16, true);          // Subchunk1Size (16 for PCM)
view.setUint16(20, 1, true);           // AudioFormat (1 = Linear PCM)
view.setUint16(22, 1, true);           // NumChannels (1 = Mono)
view.setUint32(24, 16000, true);       // SampleRate (16000 Hz)
view.setUint32(28, 16000 * 1 * 2, true);// ByteRate (SampleRate * NumChannels * BitsPerSample/8 = 32000)
view.setUint16(32, 2, true);           // BlockAlign (NumChannels * BitsPerSample/8 = 2)
view.setUint16(34, 16, true);          // BitsPerSample (16 bits)

/* data 子區塊 */
writeString(view, 36, 'data');
view.setUint32(40, pcmByteLength, true); // Subchunk2Size

/* 量化並寫入 PCM 資料 */
let offset = 44;
for (let i = 0; i < channelData.length; i++, offset += 2) {
  // 數值裁切 (Clamp) 防溢位
  let s = Math.max(-1, Math.min(1, channelData[i]));
  // Float32 to Int16
  view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true); // Little-Endian
}
```

#### 步驟 4：產生 Blob 與 Base64 字串
將組裝好的 ArrayBuffer 轉為 `Blob` 與 Base64，並回傳結構化物件：
```javascript
const blob = new Blob([buffer], { type: 'audio/wav' });
const wavBase64 = await new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => resolve(reader.result.split(',')[1]);
  reader.onerror = (e) => reject(new Error("Base64 轉換失敗"));
  reader.readAsDataURL(blob);
});

return {
  wavBase64,
  sampleRate: 16000,
  channels: 1,
  duration: renderedBuffer.duration,
  audioBuffer: renderedBuffer,
  blob
};
```

---

## 3. Fail-Safe 檔案選取與拖曳機制重構 (`soundsync.html`)

### 3.1 現有問題診斷 (Current Implementation Issues)

在檢視 `soundsync.html` 後，發現以下潛在的 Windows 平台相容性隱患與缺陷：
1. **MIME 類型阻擋問題**：原生 `<input type="file" id="audioFileInput">` 未明確限制副檔名，或若誤設為 `accept="audio/*"`，在 Windows Chrome/Edge 瀏覽器中，部分多媒體檔案（例如 `.m4a` 或 `.flac`）常因 Windows 機碼 (Registry) 的 MIME 映射為 `video/mp4` 或未定義，導致選取視窗中無法選擇該檔案。
2. **檔名亂碼與字元處置**：舊程式碼中使用 `document.getElementById("audioFileName").innerText = file.name` 時，若未以安全方式更新 DOM 或遇特殊 Unicode 檔名，可能導致畫面顯示截斷。
3. **記憶體洩漏 (Memory Leak)**：目前 `handleAudioFile` 使用 `URL.createObjectURL(file)` 產生音訊 URL，但未在切換檔案時呼叫 `URL.revokeObjectURL(oldUrl)`，重複上傳大檔案將累積大量佔用記憶體。
4. **拖曳放置體驗與全域攔截Missing**：目前僅在 `.drop-zone` 監聽拖曳事件，若使用者不小心將檔案拖到 Dropzone 外圍的空白處，瀏覽器預設行為會直接轉址並開啟該音訊檔，破壞使用者操作體驗。

---

### 3.2 具體重構與修復方案

#### 1. 優化原生檔案選取器 (`accept` 屬性修正)
將 HTML 中的檔案輸入元件改為顯式包含擴充副檔名與寬鬆 MIME：
```html
<input 
  type="file" 
  id="audioFileInput" 
  style="display:none !important;" 
  accept="audio/*,video/*,.mp3,.wav,.m4a,.ogg,.flac,.aac,.wma,.webm,.mp4,.mkv,.mov"
  onchange="if(this.files && this.files.length>0) handleAudioFileSelect(this.files[0])"
>
```

#### 2. 記憶體管理與安全檔名呈現
維護全域 `activeObjectUrl` 變數，並以 `textContent` 安全寫入檔名：
```javascript
let activeObjectUrl = null;

function updateAudioPlayerSource(file) {
  const audioPlayer = document.getElementById("audioPlayer");
  const audioFileName = document.getElementById("audioFileName");
  
  // 釋放先前建立的 ObjectURL 避免記憶體洩漏
  if (activeObjectUrl) {
    URL.revokeObjectURL(activeObjectUrl);
    activeObjectUrl = null;
  }
  
  activeObjectUrl = URL.createObjectURL(file);
  audioPlayer.src = activeObjectUrl;
  
  // 避免 HTML 注入與檔名亂碼
  audioFileName.textContent = file.name;
}
```

#### 3. 全頁面拖曳攔截 (Fail-Safe Global Drag & Drop Handler)
防止在 Dropzone 之外釋放檔案導致瀏覽器頁面跳轉：
```javascript
// 全域阻止瀏覽器預設開啟檔案行為
["dragover", "drop"].forEach(eventName => {
  window.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
  }, false);
});

// Dropzone 專屬拖曳狀態處置
const dropZone = document.querySelector(".drop-zone");
if (dropZone) {
  ["dragenter", "dragover"].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add("drop-zone-active");
    }, false);
  });
  
  ["dragleave", "drop"].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove("drop-zone-active");
    }, false);
  });
  
  dropZone.addEventListener("drop", (e) => {
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length > 0) {
      handleAudioFileSelect(dt.files[0]);
    }
  });
}
```

---

## 4. 模組整合與應用程式流程 (Application Integration Pipeline)

### 4.1 核心流程圖與資料流

```
[使用者上傳音訊 File] 
       │
       ├───> 1. 更新 UI 播放器 (`soundsync.html`)
       │        ├── URL.createObjectURL(file) 載入 <audio>
       │        └── 讀取並顯示 Duration (MM:SS) 與 安全檔名
       │
       └───> 2. 觸發背景 WebAudio 重取樣 (`js/audio-resampler.js`)
                ├── ArrayBuffer -> AudioContext decodeAudioData
                ├── OfflineAudioContext (16000 Hz, 1 Channel Mono)
                ├── Quantize Float32 -> Int16 PCM + 44-byte WAV Header
                └── 回傳 { wavBase64, duration, sampleRate: 16000 }
                         │
                         ▼
             (備妥 Base64 WAV 資料供 Milestone 2 Gemini REST API 直接呼叫)
```

---

## 5. 實作步驟指南 (Implementation Step-by-Step Guide)

當 Implementer Agent 開始執行 Milestone 1 時，請依據以下步驟順序進行實作：

### 步驟 1：建立 `js/audio-resampler.js`
1. 於 `js/` 目錄下創建 `audio-resampler.js`。
2. 實作 `AudioDecodeError` 錯誤類別。
3. 實作 `AudioResampler` 類別，包含 `resample()` 與 `encodeWAV()` 方法。
4. 確保涵蓋輸入參數型別驗證（當傳入 `null` 或非 `File/Blob/ArrayBuffer` 時拋出 Traditional Chinese 異常）。

### 步驟 2：在 `soundsync.html` 中引入 `js/audio-resampler.js`
1. 在 `soundsync.html` 底部標籤 `</body>` 前加入：
   `<script src="js/audio-resampler.js"></script>`

### 步驟 3：重構 `soundsync.html` 中的檔案處理邏輯
1. 調整 `<input type="file" id="audioFileInput">` 的 `accept` 屬性。
2. 實作全域 `activeObjectUrl` 記憶體管理機制。
3. 加入 `window` 與 `.drop-zone` 拖曳事件阻擋與狀態轉換。
4. 整合 `AudioResampler.resample(file)`：在上傳檔案或點擊「開始打軸」時觸發重取樣，並獲取 `wavBase64`。

### 步驟 4：建立單元測試與驗證腳本
1. 於 `tests/` 目錄建立 `audio-resampler.test.js` 與 `ui-file-picker.test.js`（可利用 HTML5 WebAudio Mock 進行單元驗證）。

---

## 6. 驗證點與測試規範 (Verification Criteria)

| 驗證類別 | 驗證項目 | 預期結果 (Acceptance Criteria) |
|---|---|---|
| **檔案選取 Fail-Safe** | 點擊 Dropzone 或選取按鈕 | 彈出原生檔案選擇視窗，可選取 MP3, WAV, M4A, OGG, FLAC 檔案 |
| **Windows 相容性** | 包含中文檔名（如 `測試歌曲_16kHz.mp3`） | 檔案名稱安全顯示於 UI，不出現 `???` 或轉碼錯誤 |
| **拖曳穩定度** | 將檔案拖至 Dropzone 外部 | 瀏覽器不跳轉，不觸發預設開啟檔案頁面 |
| **音訊播放器 UI** | 載入音訊檔案 | `<audio>` 播放器即時載入，顯示正確總秒數 (如 `03:45`) |
| **WebAudio 重取樣** | `AudioResampler.resample(file)` 執行 | 回傳 `sampleRate === 16000`、`channels === 1`、`wavBase64` 非空 |
| **WAV 檔頭驗證** | 解碼 Base64 前 44 位元組 | 前 4 位元組為 `"RIFF"`，8-11 位元組為 `"WAVE"`，24-27 位元組為 `16000` |
| **記憶體管理** | 連續上傳 5 個不同的 20MB 音訊檔 | `URL.revokeObjectURL` 被正確呼叫，無記憶體持續暴增現象 |

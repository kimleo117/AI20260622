# SoundSync AI 音訊處理、Gemini REST API 串接與字幕處理深度分析報告

## 一、`ORIGINAL_REQUEST.md` 需求規範與現狀審查

根據專案原始需求文件 `ORIGINAL_REQUEST.md`，SoundSync AI 旗艦版網頁應用程式的核心需求如下：

| 需求編號 | 核心功能要求 | 現有程式碼 (`soundsync.html`) 實作狀態 | 缺口 / 潛在風險 |
|---|---|---|---|
| **R1** | Fail-Safe 音訊選取與 16kHz Mono WebAudio 重採樣 Pipeline | 已實現拖曳與點擊上傳；但**完全缺失 16kHz 單聲道重採樣管道** | 原始音訊以 raw Base64 直接送出，檔案過大 (10~50MB) 易導致傳送失敗、延遲過高及 Gemini API Payload 限制 |
| **R2** | Gemini 2.0 Flash REST API 串接與自動備用 (Fallback) 機制 | 已實作 `gemini-2.0-flash` 及其備用模型鏈；包含參考歌詞輸入與 JSON 格式要求 | 未使用 `generationConfig.responseMimeType = "application/json"`，且 `parseSeconds` Timestamp 解析器存在 `MM:SS.mmm` 分鐘遺失之邏輯 Bug |
| **R3** | 字幕 Overlap Eraser、Teleprompter 與多格式字幕匯出 (.SRT/.LRC/.VTT/剪貼簿) | 已實作邊界重疊修正、播放高亮捲動與 4 種匯出方式 | Overlap Eraser 欠缺 start/end 順序防禦；LRC 匯出強依賴固定 `HH:MM:SS` 格式分割，若 API 回傳短時間格式會產生 NaN 錯誤 |

---

## 二、WebAudio 16kHz 單聲道 (Mono) 重採樣 (Resampling) 方案與瀏覽器相容性分析

### 2.1 現有問題分析
現行 `soundsync.html` 在 `handleAudioFile()` 中直接使用 `FileReader.readAsDataURL(file)` 將使用者選擇的原始音訊檔（如 44.1kHz / 48kHz 雙聲道 MP3, WAV, FLAC, M4A）轉換為 Base64。
- **檔案體積膨脹**：一首 4 分鐘 320kbps MP3 大約 10MB，轉換 Base64 後約 13.3MB；若上傳 50MB 無損 WAV，Base64 更達 66.7MB，會引發瀏覽器記憶體負擔與 API 請求逾時（HTTP 413 Payload Too Large / 400）。
- **人聲聽打效率**：Gemini 音訊模型主要辨識 16kHz 範圍內的人聲音訊，過高採樣率與雙聲道雜訊增加不必要的運算負擔。

### 2.2 實現方案設計 (`WebAudio 16kHz Mono Pipeline`)
在前端瀏覽器使用 WebAudio API (`AudioContext` / `OfflineAudioContext`) 在本地端迅速將音訊重採樣為 `16000 Hz` 單聲道 16-bit PCM WAV：

```javascript
async function resampleAudioTo16kMonoWav(file) {
  const arrayBuffer = await file.arrayBuffer();
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  
  // 建立 16kHz 單聲道 OfflineAudioContext
  const targetSampleRate = 16000;
  const numChannels = 1;
  const totalFrames = Math.ceil(audioBuffer.duration * targetSampleRate);
  
  const offlineCtx = new OfflineAudioContext(numChannels, totalFrames, targetSampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start(0);
  
  const renderedBuffer = await offlineCtx.startRendering();
  const float32PCM = renderedBuffer.getChannelData(0);
  
  // 轉碼為 16-bit PCM WAV 包含 44 位元組 RIFF 標頭
  const wavBuffer = encode16BitPCMToWAV(float32PCM, targetSampleRate);
  audioCtx.close();
  return wavBuffer; // ArrayBuffer (MIME: audio/wav)
}
```

#### WAV 16-bit PCM Header 轉碼邏輯：
1. **RIFF Chunk Header** (12 bytes): `"RIFF"`, `fileLength`, `"WAVE"`
2. **fmt Sub-chunk** (24 bytes): `"fmt "`, `16` (subchunk1Size), `1` (PCM format), `1` (numChannels), `16000` (sampleRate), `32000` (byteRate = 16000 * 1 * 2), `2` (blockAlign = 1 * 2), `16` (bitsPerSample)
3. **data Sub-chunk**: `"data"`, `dataSize`, `Int16Array` (Float32 [-1.0, 1.0] 縮放至 Int16 [-32768, 32767])

### 2.3 瀏覽器相容性分析 (Browser Compatibility)
- `AudioContext` & `decodeAudioData`: Chrome 35+, Edge 12+, Firefox 25+, Safari 14.1+, iOS Safari 14.5+ 全面支援。
- `OfflineAudioContext`: 所有主流 Chrome、Firefox、Edge、Safari 最新版本皆完全相容。
- **優點**：4 分鐘音訊經 16kHz 16-bit Mono 重採樣後，極限體積僅約 7.68 MB (WAV)，轉 Base64 僅約 10.2 MB，降幅達 50% ~ 80%，並大幅提高 API 解析精準度。

---

## 三、Gemini 2.0 Flash REST API 串接、JSON 解析與 Fallback 機制

### 3.1 REST API 呼叫格式與規範
- **Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`
- **HTTP Method**: `POST`
- **Headers**: `"Content-Type": "application/json"`
- **Payload 結構**:
  ```json
  {
    "contents": [
      {
        "parts": [
          { "inlineData": { "mimeType": "audio/wav", "data": "<Base64_String>" } },
          { "text": "<Prompt_Instruction>" }
        ]
      }
    ],
    "generationConfig": {
      "responseMimeType": "application/json",
      "temperature": 0.2
    }
  }
  ```

### 3.2 備用 Endpoint (Fallback Chain) 機制
現有 `soundsync.html` 採用備用模型迴圈：
1. `gemini-2.0-flash` (優先使用 2026 旗艦速度/效果平衡模型)
2. `gemini-2.0-flash-exp` (備用實驗模型)
3. `gemini-1.5-flash-latest` (前代穩定模型)
4. `gemini-1.5-flash-8b` (輕量化備用模型)

此備用機制架構完善，能有效防範單一模型暫時維護或 404/429 錯誤。

### 3.3 參考歌詞 (Reference Lyrics) Prompt 構建方案
當使用者輸入參考歌詞時，Prompt 應嚴格指示模型對齊字詞：
```text
你是一位專業的音訊工程師與歌詞字幕打軸大師。
請解析這段音訊檔，將歌詞/對白進行高精度時間軸對齊 (Timestamps Alignment)。

【參考歌詞文本】：
[歌詞內容]

【嚴格要求】：
1. 請將上述參考歌詞 100% 完整對齊至音訊對應時間點，絕不可遺漏或擅自刪減任何一句。
2. 輸出格式必須為純 JSON Array，無任何 markdown 標籤：
[
  { "start": "00:00:01.200", "end": "00:00:04.500", "text": "歌詞第一句" }
]
3. 時間格式必須為 HH:MM:SS.mmm (例如 00:01:12.450)。
```

### 3.4 JSON Timestamp Parsing 缺陷與強化修正
在現有 `soundsync.html` 第 498 行：
```javascript
function parseSeconds(str) {
  if (!str) return 0;
  const parts = str.split(":");
  if (parts.length === 3) {
    return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
  }
  return parseFloat(str) || 0;
}
```
**關鍵漏洞分析**：
- 若 Gemini 回傳時間格式為 `01:23.450`（2 個分頁：`parts.length === 2`），`parseSeconds` 會跳過 `parts.length === 3` 判斷，執行 `parseFloat("01:23.450")`，回傳 `1` 秒！**導致分鐘數完全遺失**。
- 若 Gemini 回傳數值型態 `12.5`，`str.split` 會觸發 Runtime Type Error。

**健壯型解析器方案**：
```javascript
function parseSeconds(str) {
  if (str === null || str === undefined) return 0;
  if (typeof str === "number") return str;
  const sStr = String(str).trim();
  const parts = sStr.split(":");
  if (parts.length === 3) {
    return (parseFloat(parts[0]) || 0) * 3600 + (parseFloat(parts[1]) || 0) * 60 + (parseFloat(parts[2]) || 0);
  } else if (parts.length === 2) {
    return (parseFloat(parts[0]) || 0) * 60 + (parseFloat(parts[1]) || 0);
  }
  return parseFloat(sStr) || 0;
}
```

---

## 四、字幕 Overlap Eraser、Teleprompter 與多格式匯出邏輯

### 4.1 字幕 Overlap Eraser (重疊修正演算法)
- **現有邏輯**：逐句比較 `currEnd` 與 `nextStart`，若 `currEnd >= nextStart`，則修正 `subtitles[i].end = nextStart - 0.05s` (預留 50ms 緩衝區)。
- **邊界問題與增強**：
  1. 陣列未排序：若模型回傳時間點有些微交錯，需先依 `start` 升冪排序。
  2. 極限覆蓋：若 `nextStart - 0.05` 小於 `currStart`（例如重疊極大），則修正為 `currStart + 0.1`，避免結束時間早於開始時間。

### 4.2 Teleprompter (提詞器即時捲動與跳轉)
- **點擊跳轉**：點擊時間軸列表項，觸發 `audioPlayer.currentTime = start` 並立即 `play()`。
- **即時追蹤捲動**：監聽 `<audio>` 的 `timeupdate` 事件：
  - 匹配 `curTime >= start && curTime <= end` 之字幕列，新增 `.active-line` 高亮類別。
  - 原 code 使用 `item.scrollIntoView({ behavior: "smooth", block: "nearest" })`。
  - **優化建議**：將 `block` 改為 `"center"`，可使目前演唱歌詞保持在提詞視窗中央，視覺體驗更佳。

### 4.3 多格式匯出與剪貼簿複製
1. **.SRT (SubRip Subtitle)**:
   - 格式要求：`HH:MM:SS,mmm --> HH:MM:SS,mmm` (小數點須改為逗號 `,`)。
   - 現有代碼在轉碼時需要確保毫秒位數補足 3 位 (例 `,200` 而非 `,2`)。
2. **.LRC (Lyric File)**:
   - 格式要求：`[mm:ss.xx] 歌詞` (其中 `xx` 為百分之一秒，2 位數)。
   - 現有代碼若遇 `parts.length === 2` 會產生 `NaN`，需使用統一的 `formatSecondsToLRC(parseSeconds(sub.start))` 重新編碼。
3. **.VTT (WebVTT)**:
   - 格式要求：標頭 `WEBVTT`，時間戳 `HH:MM:SS.mmm --> HH:MM:SS.mmm`。
4. **純文字剪貼簿複製**:
   - 使用 `navigator.clipboard.writeText(txtStr)` 支援一鍵複製全文本。

---

## 五、探索總結與修改建議 (Actionable Proposals)

1. **新增 `resampleAudioTo16kMonoWav` 模組**：在 `soundsync.html` 的 JavaScript 中導入 WebAudio 重採樣邏輯，大幅降低上傳 API 的封包大小。
2. **強化 API 呼叫設定**：於 `requestBody` 中補上 `generationConfig: { responseMimeType: "application/json" }`。
3. **重構 `parseSeconds` 與時間格式化工具**：修復 `MM:SS.mmm` 格式解析漏洞與 LRC/SRT 時間碼匯出的邊界 Bug。
4. **優化 Teleprompter 視覺體驗**：將 `scrollIntoView` 的 `block` 設為 `"center"`。

本分析完全遵循 `DESIGN.md` 與台灣繁體中文全域規範。

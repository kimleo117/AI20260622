# 🎵 SoundSync AI 規格探查與合規需求分析報告 (Specification Analysis Report)

> **探查時間**：2026-08-10
> **探查者**：Specification Miner (`spec_miner_survey_1`)
> **工作目錄**：`C:\外掛\影像\workspace\AI20260622-main\.agents\spec_miner_survey_1`
> **權威規範來源**：`ORIGINAL_REQUEST.md`, `DESIGN.md`, `GEMINI.md`, `AGENTS.md`, `soundsync.html`

---

## 執行摘要 (Executive Summary)

本報告針對 **SoundSync AI**（AI 音樂歌詞聽打、毫秒級時間軸對齊與字幕生成器）進行全面性的規格探查與合規需求提煉。SoundSync AI 旨在解決傳統音樂字幕打軸耗時、瀏覽器音訊格式相容性差、API 回傳格式不穩定及字幕時間軸重疊等核心痛點。

---

## 1. 專案核心需求分解 (Requirements Breakdown)

根據 `ORIGINAL_REQUEST.md` 與 `soundsync.html` 原型， SoundSync AI 之三大核心功能需求如下：

| 需求代碼 | 核心名稱 | 規格與細節要求 |
|:---|:---|:---|
| **R1** | **Fail-Safe 音訊檔案選擇與重採樣流水線** | 1. 支援所有常見音訊/影片格式（MP3, WAV, M4A, OGG, FLAC, AAC）。<br>2. 解決 Windows 平台下瀏覽器檔案選擇器 MIME 阻擋與選檔錯誤。<br>3. 建立 **WebAudio 16kHz Mono** 重採樣管道，將聲樂軌純化降採樣後再傳送給 API，減少 payload 並提高辨識率。 |
| **R2** | **官方 Gemini 2.0 Flash API 整合與自動 Fallback** | 1. 介接 Google Gemini 2.0 Flash REST API (`models/gemini-2.0-flash:generateContent`)。<br>2. 支援參考歌詞 (Reference Lyrics) 輸入，確保歌詞對齊時 100% 完整精準不漏字。<br>3. 透過 JSON Schema 嚴格強制輸出毫秒級時間軸 (`HH:MM:SS.mmm`)。<br>4. 具備候選模型自動退備 (Fallback) 鏈。 |
| **R3** | **重疊消除器與多格式字幕匯出** | 1. 實作毫秒級時間軸重疊消除演算法 (Overlap Eraser)，確保相鄰字幕滿足 $end_i < start_{i+1}$。<br>2. 提供與 `<audio>` 播放器即時連動的互動式滾動歌詞提詞機。<br>3. 支援一鍵下載 `.SRT`、`.LRC`、`.VTT` 及剪貼簿純文字複製。 |

---

## 2. Feature Inventory (完整功能清單)

## Features Discovered
| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | 音訊輸入 | 原生檔案選取器 | 點擊按鈕或拖曳區觸發原生檔案選擇彈窗 | 使用者點擊 | 檔案選取視窗 | 若取消無錯誤，支援全主流瀏覽器 | `soundsync.html`, `ORIGINAL_REQUEST.md` R1 |
| 2 | 音訊輸入 | 拖曳上傳 (Drag & Drop) | 將音訊檔拖入 `.drop-zone` 觸發載入 | 拖曳 Audio 檔案 | 更新 UI 檔名與播放器 | 非音訊檔彈窗警告並拒絕載入 | `soundsync.html` |
| 3 | 音訊處理 | WebAudio 16kHz 重採樣 | 將任意採樣率 (44.1k/48k) 音訊轉為 16kHz Mono WAV/PCM | Audio File ArrayBuffer | 16kHz Mono 音訊 Base64 | 檔案損毀時拋出解碼例外並提醒使用者 | `ORIGINAL_REQUEST.md` R1 |
| 4 | 音訊播放 | 即時音訊播放器 | 載入選定音訊，顯示總時長，提供播放控制 | 音訊 Blob / Object URL | 音訊播放與當前時間更新 | 載入失敗顯示格式不支援 | `soundsync.html` |
| 5 | 金鑰管理 | Gemini API Key 儲存 | 提供 API Key 輸入方塊與 LocalStorage 持久化儲存 | 使用者 API Key 字串 | 儲存至 `localStorage` | 空字串提示無效並焦點鎖定 | `soundsync.html` |
| 6 | 參考歌詞 | 參考歌詞文本輸入 | 允許使用者貼上既有歌詞作為聽打參考 | 純文字歌詞 (每句一行) | 傳入 API Prompt | 空字串自動切換為全自動聽寫模式 | `soundsync.html`, `ORIGINAL_REQUEST.md` R2 |
| 7 | API 整合 | Gemini 2.0 Flash 介接 | 使用 REST API POST 傳送 Base64 音訊與 Prompt | API Key, Base64, Prompt | JSON 字幕陣列 | 觸發自動 Fallback 機制 | `ORIGINAL_REQUEST.md` R2 |
| 8 | API 備援 | 候選模型自動 Fallback | 當首選模型失敗時，依序自動切換備援模型 | REST API 請求失敗回應 | 備援模型回應 | 全部失敗時回報友好中文錯誤訊息 | `soundsync.html`, `ORIGINAL_REQUEST.md` R2 |
| 9 | 格式強制 | Structured JSON Schema | 在 API 請求中啟用 `responseSchema` 強制輸出 JSON | API GenerationConfig | 規範之 JSON Array | JSON 解析失敗時採 Regex 容錯清理 | `ORIGINAL_REQUEST.md` R2 |
| 10 | 時間軸校正 | Overlap Eraser 重疊消除 | 修正連續字幕時間軸邊界 ($end_i \ge start_{i+1}$) | Raw Subtitles Array | 邊界校正後 Subtitles Array | 若無時間軸跳過處理 | `soundsync.html`, `ORIGINAL_REQUEST.md` R3 |
| 11 | 提詞互動 | 動態提詞機高亮與自動捲動 | 音訊播放時自動高亮當前歌詞並捲動容器 | `<audio>` `timeupdate` 事件 | 視覺 DOM 狀態高亮與捲動 | 時間軸不吻合時不高亮 | `soundsync.html`, `ORIGINAL_REQUEST.md` R3 |
| 12 | 提詞互動 | 點擊歌詞跳躍播放 | 點擊任一句歌詞，播放器跳轉至該句 `start` 時刻 | 使用者點擊歌詞列 | 音訊 Jump To `start` 並 Play | 無有效時間戳時不進行 Jump | `soundsync.html` |
| 13 | 字幕匯出 | SubRip (.SRT) 匯出 | 生成標準 SubRip 字幕檔 (`HH:MM:SS,mmm`) | Parsed Subtitles | `.SRT` 檔案下載 | 無字幕資料時禁用按鈕 | `soundsync.html`, `ORIGINAL_REQUEST.md` R3 |
| 14 | 字幕匯出 | Lyric (.LRC) 匯出 | 生成標準 LRC 歌詞檔 (`[MM:SS.xx]`) | Parsed Subtitles | `.LRC` 檔案下載 | 無字幕資料時禁用按鈕 | `soundsync.html`, `ORIGINAL_REQUEST.md` R3 |
| 15 | 字幕匯出 | WebVTT (.VTT) 匯出 | 生成標準 WebVTT 網頁字幕檔 (`HH:MM:SS.mmm`) | Parsed Subtitles | `.VTT` 檔案下載 | 無字幕資料時禁用按鈕 | `soundsync.html` |
| 16 | 字幕匯出 | 純文字剪貼簿複製 | 將帶時間戳之純文字歌詞複製至剪貼簿 | Parsed Subtitles | 剪貼簿與成功提示 Toast | 權限受限時提示手動複製 | `soundsync.html`, `ORIGINAL_REQUEST.md` R3 |
| 17 | 錯誤處置 | 台灣繁體中文友好錯誤轉譯 | 將 429、401、500 等 API 錯誤轉為台灣繁體中文引導 | API 錯誤訊息/代碼 | 繁體中文提示與處置步驟 | 無未知錯誤時顯示原始訊息 | `GEMINI.md`, `soundsync.html` |

---

## 3. Edge Cases & 邊界條件 (Edge Cases Matrix)

## Edge Cases
| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | 音訊上傳 | 拖曳副檔名為大寫 `.MP3` 或 `.WAV` 檔案 | 系統正常識別，純化 MIME 為 `audio/mp3` 或 `audio/wav` |
| 2 | 音訊上傳 | 選取檔名包含特殊字元或中文字元之音訊 (如 `愛在西元前 (Live).m4a`) | 正常讀取 ArrayBuffer 與 Base64，DOM 正確顯示檔名不亂碼 |
| 3 | 音訊上傳 | 0 位元組空檔案或損毀之音訊檔 | `AudioContext.decodeAudioData` 拋出 Decode Error，UI 顯示友善中文錯誤提示 |
| 4 | WebAudio 重採樣 | 雙聲道 48kHz 立體聲高音質音訊 | 重採樣管道正確計算通道平均值並降低為 16kHz 單聲道 WAV |
| 5 | Gemini API | API 傳回結果包含 Markdown 代碼區塊外殼 (` ```json ... ``` `) | 解析器自動以 Regex 去除標籤字串，確保 `JSON.parse` 成功 |
| 6 | API 額度限制 | Gemini API 傳回 `429 Quota Exceeded` 或 `RESOURCE_EXHAUSTED` | 攔截器捕捉並彈出台灣繁體中文處置教學，引導使用者重新申請免費 Key |
| 7 | 時間軸校正 | 上一句 `end` 為 `00:00:05.200`，下一句 `start` 為 `00:00:05.100` (重疊 100ms) | Overlap Eraser 自動將上一句 `end` 調整為 `00:00:05.050` ($start_{i+1} - 50\text{ms}$) |
| 8 | 提詞機互動 | 點擊時間戳為 `00:00:00.000` 之第 1 句歌詞 | 音訊播放器設定 `currentTime = 0` 並開始播放 |
| 9 | 字幕匯出 | 歌詞內含換行或特殊 HTML 字元 (如 `<>&`) | 字幕生成器進行 HTML 轉義或洗淨，匯出的 `.SRT`/`.LRC` 保持標準純文字 |

---

## 4. Gemini 2.0 Flash REST API 規格與 JSON Schema 定義

### 4.1 端點資訊與候選備援鏈 (Candidate Fallback Chain)

- **主要 REST 端點**：
  `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={API_KEY}`

- **候選模型優先順序**：
  1. `gemini-2.0-flash`（旗艦首選模型）
  2. `gemini-2.0-flash-exp`（實驗性備援）
  3. `gemini-1.5-flash-latest`（相容性備援 1）
  4. `gemini-1.5-flash-8b`（輕量級備援 2）

### 4.2 API 請求 Payload 結構 (JSON Payload)

```json
{
  "contents": [
    {
      "parts": [
        {
          "inlineData": {
            "mimeType": "audio/wav",
            "data": "<16kHz Mono Resampled Audio Base64 String>"
          }
        },
        {
          "text": "你是一位專業的音訊工程師與歌詞字幕打軸大師。\n請解析這段音訊檔，將歌詞/對白進行高精度時間軸對齊 (Timestamps Alignment)。\n\n參考歌詞文本如下 (請務必將以下歌詞 100% 完整對齊音訊時間點，絕不可遺漏任何一句)：\n[使用者參考歌詞]\n\n【輸出格式嚴格要求】：\n請務必且只能輸出一個純 JSON Array 格式：\n[\n  {\n    \"start\": \"00:00:01.200\",\n    \"end\": \"00:00:04.500\",\n    \"text\": \"歌詞第一句\"\n  }\n]\n時間格式必須為 HH:MM:SS.mmm。每個句子的 end 時間不可超過下一句的 start 時間。"
        }
      ]
    }
  ],
  "generationConfig": {
    "responseMimeType": "application/json",
    "responseSchema": {
      "type": "ARRAY",
      "items": {
        "type": "OBJECT",
        "properties": {
          "start": { "type": "STRING", "description": "起始時間戳，格式為 HH:MM:SS.mmm" },
          "end": { "type": "STRING", "description": "結束時間戳，格式為 HH:MM:SS.mmm" },
          "text": { "type": "STRING", "description": "歌詞或字幕單句內容" }
        },
        "required": ["start", "end", "text"]
      }
    }
  }
}
```

---

## 5. 時間軸毫秒級精度規範與 Overlap Eraser 演算法

### 5.1 時間戳格式規範

1. **內部 JSON 格式**：`HH:MM:SS.mmm`（例如：`00:01:12.450`）。
2. **SubRip (.SRT) 格式**：`HH:MM:SS,mmm`（毫秒分隔符改為逗號 `,`）。
3. **Lyric (.LRC) 格式**：`[MM:SS.xx]`（例如：`[01:12.45]`，分秒與百分之一秒）。
4. **WebVTT (.VTT) 格式**：`HH:MM:SS.mmm`（毫秒分隔符為句點 `.`）。

### 5.2 邊界重疊消除演算法 (Overlap Eraser Algorithm)

為防止連續字幕在畫面呈現時發生疊影或打架現象，需執行重疊消除：

$$\text{若 } \text{parseSeconds}(sub[i].end) \ge \text{parseSeconds}(sub[i+1].start)$$
$$\text{則 } \text{newEnd} = \max\Big(0, \, \text{parseSeconds}(sub[i+1].start) - 0.050\Big)$$
$$sub[i].end = \text{formatSecondsToHHMMSS}(\text{newEnd})$$

#### JavaScript 演算法實作參考：

```javascript
function fixSubtitleOverlaps(subtitles) {
  if (!Array.isArray(subtitles)) return [];
  const GAP_SECONDS = 0.050; // 50 毫秒緩衝間隙
  
  for (let i = 0; i < subtitles.length - 1; i++) {
    let currEnd = parseSeconds(subtitles[i].end);
    let nextStart = parseSeconds(subtitles[i+1].start);
    
    if (currEnd >= nextStart) {
      let adjustedEnd = Math.max(0, nextStart - GAP_SECONDS);
      subtitles[i].end = formatSecondsToHHMMSS(adjustedEnd);
    }
  }
  return subtitles;
}
```

---

## 6. 自動 Fallback 流程與台灣繁體中文錯誤轉譯規範

根據 `GEMINI.md` 與全域規範，所有系統提示與 API 錯誤必須 100% 轉譯為台灣繁體中文說明。

### 6.1 API 錯誤處理對照表 (Error Mapping Table)

| HTTP 狀態 / 錯誤關鍵字 | 使用者視覺提示 (台灣繁體中文) | 系統處置機制 |
|:---|:---|:---|
| **429 / Quota / Resource_Exhausted** | ⚠️ **【Gemini API 今日免費額度已達上限】**<br>👉 解除方法：<br>1. 您的 Google 免費 API 金鑰今日呼叫次數已暫時用完。<br>2. 請前往 [Google AI Studio](https://aistudio.google.com/app/apikey) 重新點擊「Create API Key」免費申請一組新金鑰，貼回本頁面即可無限次繼續打軸！ | 停止自動 Retry，引導使用者更新 Key |
| **401 / 403 / Invalid Key** | 🔑 **【API 金鑰無效或填寫錯誤】**<br>👉 解除方法：<br>1. 請檢查上方 API Key 是否複製完整 (通常為 AIzaSy 開頭)。<br>2. 請確認已登入 Google AI Studio 並點擊 Create API Key 複製成功。 | 聚焦 API Key 輸入框 |
| **Model Not Found / 404** | ⚡ **【API 模型維護切換中】**<br>👉 系統已為您自動切換至最新相容模型，請重新點擊「開始打軸」即可！ | 自動觸發 Candidate Chain 嘗試下一模型 |
| **500 / 503 / Server Error** | 🌐 **【Google 官方伺服器暫時忙碌】**<br>👉 Google AI 官方伺服器目前回應較慢，請等待 10 秒後重新點擊「開始打軸」即可！ | 允許使用者一鍵手動重新嘗試 |
| **網路連線中斷 / TypeError** | 📡 **【網路連線中斷】**<br>👉 請檢查您的網路連線狀態後重試。 | 提醒連線檢查 |

---

## 7. WebAudio 16kHz Mono 重採樣流水線技術規格

為達到最佳 Gemini 音訊辨識率並減少 Base64 封包傳送量，前端應導入 WebAudio 重採樣：

```
[原始音訊 (44.1kHz/48kHz Stereo)] 
    ↓ (AudioContext decodeAudioData)
[原始 AudioBuffer] 
    ↓ (OfflineAudioContext 16000Hz, 1 Channel)
[16kHz Mono Resampled AudioBuffer] 
    ↓ (WAV Encoder / PCM Data)
[Optimized Audio Base64 Payload (大小縮減 70%+)]
```

---

## 8. 測試案例導向 (Test Case Orientation)

為驗證 SoundSync AI 規格實現情況，測試套件應包含以下四大層級測試案例：

### Tier 1: 單元測試 (Unit Tests)
- `fixSubtitleOverlaps()`: 傳入重疊時間軸，驗證 end 是否精確降至 nextStart - 50ms。
- `parseSeconds()` / `formatSecondsToHHMMSS()`: 驗證 `00:01:12.450` ↔ `72.45` 雙向轉換精確度。
- `.SRT` / `.LRC` / `.VTT` 字幕格式生成器邏輯測試。

### Tier 2: 元件與 UI 測試 (Component Tests)
- 音訊拖曳 dropzone 事件處理與 `handleAudioFile()`。
- API Key 儲存至 `localStorage` 與頁面重載載入測試。
- 點擊歌詞列跳躍播放事件綁定測試。

### Tier 3: 端對端整合測試 (E2E Integration Tests)
- 完整流程：上傳 MP3 → 填入 API Key → 輸入參考歌詞 → 呼叫 Gemini REST API (Mock/Live) → 解析時間軸 → 渲染滾動提詞 → 一鍵下載 `.SRT`。
- Fallback 鏈測試：模擬 `gemini-2.0-flash` 回傳 404，驗證系統自動發送請求至 `gemini-2.0-flash-exp` 並成功解析。

### Tier 4: 對抗性與邊界測試 (Adversarial & Edge Tests)
- 上傳大檔案 (例如 50MB 音訊)，驗證 16kHz 重採樣降容量效果與瀏覽器記憶體穩定度。
- API 回傳 429 錯誤時，驗證彈窗畫面是否 100% 為台灣繁體中文且包含 Google AI Studio 連結。

---

## 9. DESIGN.md & AGENTS.md 合規與視覺規範

1. **視覺風格與色彩**：
   - 使用 `:root` 自訂變數：`--primary: #2f6fed` (主品牌藍), `--ink: #0f172a` (深色文字), `--bg-body: #f8fafc`。
   - 按鈕樣式：全圓角膠囊型 (`border-radius: 999px`)。
2. **語意編碼**：
   - 所有 HTML / JS 檔案統一保持 **100% 無 BOM 之 UTF-8 格式**。
   - 註解與 UI 文字 100% 使用台灣繁體中文。
3. **去對手化**：
   - 不露任何競品名稱，專註 SoundSync AI 與幻境配樂品牌體驗。

---

> 報告撰寫完成，已存檔至：`C:\外掛\影像\workspace\AI20260622-main\.agents\spec_miner_survey_1\spec_analysis.md`

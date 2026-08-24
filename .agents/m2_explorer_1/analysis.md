# Milestone 2 核心 API 整合與自動降級鏈研析報告

**專案名稱**: SoundSync AI (AI 聲樂對齊與字幕時間軸生成器)  
**目標里程碑**: Milestone 2 (Official Gemini 2.0 Flash API Integration with Automatic Fallback)  
**撰寫者**: Explorer Agent (`m2_explorer_1`)  
**日期**: 2026-08-10  
**語言規範**: 100% 台灣繁體中文 (Traditional Chinese - Taiwan)

---

## 1. 執行摘要 (Executive Summary)

本報告針對 **SoundSync AI** 的 Milestone 2 核心技術需求進行深入程式碼研析與獨立模組設計方案規劃。Milestone 2 的核心目標在於建立高可靠度、高精準度且兼具容錯能力之 REST API 呼叫管道，將處理後之 16kHz 單聲道音訊轉換為具備微秒級時間戳之結構化字幕時間軸。

本研析完成三大關鍵機制之架構設計與介面規範：
1. **獨立 API 客戶端模組 (`js/gemini-api.js`)**：設計具備 API Key 本地安全持久化、4 階模型自動降級鏈 (`gemini-2.0-flash` ➔ `gemini-2.0-flash-exp` ➔ `gemini-1.5-flash-latest` ➔ `gemini-1.5-flash-8b`) 與台灣繁體中文友善錯誤轉譯之客戶端。
2. **`generationConfig` 與 JSON Schema 強制定義**：運用 Gemini 2.0 官方 `responseMimeType: "application/json"` 與 `responseSchema` 結構化輸出功能，配合防禦性 Markdown 清除器，確保 100% 穩定輸出格式一致之 JSON 陣列。
3. **參考歌詞 (Reference Lyrics) 精準對齊 Prompt 構建模式**：設計「雙模式 (雙軌)」Prompt 範本，結合防遺漏約束指令，確保傳入參考歌詞時能夠達到 100% 零遺漏對齊，並相容無參考歌詞時的全自動音樂聽打需求。

---

## 2. `js/gemini-api.js` 模組設計與 4 階降級鏈 (Fallback Chain)

### 2.1 API Key 安全管理與持久化

- **儲存機制**：採用瀏覽器原生 `localStorage` 進行 Persistence 讀寫，鍵名固定為 `"soundsync_gemini_key"`。
- **安全防護**：
  - 避免將 API Key 寫死於專案程式碼中或輸出至前端全域紀錄檔 (`console.log`)。
  - 前端輸入框採用 `<input type="password">` 隱藏顯示。
  - 在發送 REST API 請求時，僅於 URL Query Parameter `?key=${apiKey}` 中動態帶入。
- **金鑰驗證與處理**：
  - 呼叫前檢查金鑰字串是否為非空（剔除前後空白 `.trim()`）。
  - 若金鑰未填寫或已失效，即時中斷流程並引導使用者前往 Google AI Studio 申請免費 Key (`https://aistudio.google.com/app/apikey`)。

---

### 2.2 4 階模型降級鏈與重試機制 (Candidate Models Fallback)

為應對 Google AI 服務偶發之特定模型維護、區域額度上限 (429 Quota Exceeded) 或 500/503 伺服器忙碌，設計 4 階備用模型依序降級切換機制：

```
[ Primary: gemini-2.0-flash (旗艦模型) ]
                  │ (發生 HTTP 429/500/503/404 或連線失敗)
                  ▼
[ Fallback 1: gemini-2.0-flash-exp (第一備用) ]
                  │ (失敗)
                  ▼
[ Fallback 2: gemini-1.5-flash-latest (第二備用) ]
                  │ (失敗)
                  ▼
[ Fallback 3: gemini-1.5-flash-8b (第三備用) ]
                  │ (全部失敗)
                  ▼
[ 拋出最後擷取之台灣繁體中文友善錯誤 ]
```

#### 模型降級配置陣列
```javascript
const CANDIDATE_MODELS = [
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash 旗艦模型" },
  { id: "gemini-2.0-flash-exp", name: "Gemini 2.0 Flash Exp" },
  { id: "gemini-1.5-flash-latest", name: "Gemini 1.5 Flash Latest" },
  { id: "gemini-1.5-flash-8b", name: "Gemini 1.5 Flash 8B" }
];
```

#### 自動重試與進度通知 (`onProgress`)
- 在請求迴圈中，呼叫可選的回調函數 `onProgress(modelName, modelIndex, totalModels)`。
- UI 可據此即時更新進度提示文字（如：`SoundSync AI 正在使用 [Gemini 2.0 Flash Exp] 高速對齊打軸中...`）。
- 只要其中任一模型回傳成功的 `200 OK` 且包含有效 `candidates` 內容，立即終止重試迴圈並回傳結果。
- 若所有 4 個模型皆嘗試失敗，收集最後一次捕捉到的 Error Message 並透過錯誤轉譯器轉換為繁體中文呈現。

---

### 2.3 台灣繁體中文友善錯誤轉譯器 (Traditional Chinese Error Translator)

將原生 HTTP 錯誤碼與英文例外訊息轉譯為 100% 台灣繁體中文白話提示，並附加具體可行之解決步驟指南：

```javascript
function getFriendlyChineseError(rawMsg) {
  if (!rawMsg) return "連線發生異常，請檢查網路或 API Key 設定。";
  const msg = String(rawMsg).toLowerCase();

  // 1. 額度爆量或頻率限制 (HTTP 429)
  if (msg.includes("quota") || msg.includes("resource_exhausted") || msg.includes("429") || msg.includes("limit")) {
    return `⚠️【Gemini API 今日免費額度已達上限】\n\n` +
           `👉 解除方法：\n` +
           `1. 您的 Google 免費 API 金鑰今日呼叫次數已暫時用完。\n` +
           `2. 請前往 https://aistudio.google.com/app/apikey 重新點擊「Create API Key」免費申請一組新金鑰，貼回本頁面即可無限次繼續打軸！`;
  }

  // 2. 金鑰無效或權限不符 (HTTP 401 / 403)
  if (msg.includes("invalid") || msg.includes("key") || msg.includes("unauthorized") || msg.includes("401") || msg.includes("403")) {
    return `🔑【API 金鑰無效或填寫錯誤】\n\n` +
           `👉 解除方法：\n` +
           `1. 請檢查上方 API Key 是否複製完整 (通常為 AIzaSy 開頭)。\n` +
           `2. 請確認已登入 Google AI Studio 並點擊 Create API Key 複製成功。`;
  }

  // 3. 模型不存在或區域維護 (HTTP 404)
  if (msg.includes("not found") || msg.includes("model")) {
    return `⚡【API 模型維護切換中】\n\n` +
           `👉 系統已為您自動切換至最新相容模型，請重新點擊「開始打軸」即可！`;
  }

  // 4. Google 伺服器端錯誤 (HTTP 500 / 503)
  if (msg.includes("500") || msg.includes("503") || msg.includes("internal") || msg.includes("server")) {
    return `🌐【Google 官方伺服器暫時忙碌】\n\n` +
           `👉 Google AI 官方伺服器目前回應較慢，請等待 10 秒後重新點擊「開始打軸」即可！`;
  }

  // 預設未知錯誤
  return `❌ 系統提示：${rawMsg}`;
}
```

---

## 3. `generationConfig` 與 JSON Schema 強制定義

### 3.1 結構化輸出配置與 Schema 定義

為徹底排除 LLM 輸出自然語言多餘解說或格式跑樣問題，在發送到 Gemini REST API 的 JSON Payload 中，務必包含 `generationConfig` 配置：

```json
{
  "contents": [
    {
      "parts": [
        {
          "inlineData": {
            "mimeType": "audio/wav",
            "data": "<BASE64_ENCODED_WAV_DATA>"
          }
        },
        {
          "text": "<PROMPT_INSTRUCTIONS>"
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
          "start": {
            "type": "STRING",
            "description": "Start timestamp in HH:MM:SS.mmm or MM:SS.mmm format"
          },
          "end": {
            "type": "STRING",
            "description": "End timestamp in HH:MM:SS.mmm or MM:SS.mmm format"
          },
          "text": {
            "type": "STRING",
            "description": "Aligned lyric line text"
          }
        },
        "required": ["start", "end", "text"]
      }
    }
  }
}
```

### 3.2 結構化輸出好處與多重防禦機制

1. **原生存取**：`responseMimeType: "application/json"` 強制模型以標準 JSON 格式回應，不帶自然語言對話。
2. **欄位驗證**：`responseSchema` 要求物件陣列必須嚴格包含 `start`, `end`, `text` 三個屬性。
3. **多重防禦 Markdown 清除器**：
   部分舊版模型（如 1.5 降級模型）在某些情況下仍可能在外層包覆 ` ```json ... ``` `。因此，前端在 `JSON.parse` 之前，必須執行防禦性字串清理：
   ```javascript
   function cleanJsonResponseText(rawText) {
     if (!rawText) return "[]";
     let cleaned = String(rawText).trim();
     // 移除 ```json 或 ``` 標籤
     cleaned = cleaned.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
     return cleaned;
   }
   ```

---

## 4. 參考歌詞 (Reference Lyrics) Prompt 構建模式與 100% 精準對齊

### 4.1 雙模式 Prompt 構建設計

當使用者提供參考歌詞時，模型主要任務為「時間點打軸與語音對齊」；當未提供參考歌詞時，模型任務為「全自動聽寫與打軸」。

#### 模式 A：有參考歌詞 (Reference Lyrics Present) — 100% 精準對齊
```javascript
function buildPrompt(referenceLyrics) {
  if (referenceLyrics && referenceLyrics.trim().length > 0) {
    return `你是一位專業的音訊工程師與歌詞字幕打軸大師。
請解析傳入的音訊檔，並將下列提供的【參考歌詞文本】進行微秒級高精度時間軸對齊 (Timestamps Alignment)。

【參考歌詞文本】（必須 100% 完整對齊，絕不可遺漏、修改或跳過任何一句）：
${referenceLyrics.trim()}

【對齊與打軸嚴格規則】：
1. 必須 100% 完整對齊參考歌詞中的每一行與每一個字，不得自行刪減、修改或新增文字。
2. 請依據音訊中實際發音起止時間，為每一行歌詞標註精準的 start 與 end 時間點。
3. 時間格式必須為 HH:MM:SS.mmm 或 MM:SS.mmm (例如 00:00:01.200 或 01:12.450)。
4. 每個句子的 end 時間點不可大於或重疊至下一句的 start 時間點。`;
  } else {
    // 模式 B：無參考歌詞 (Auto Transcription)
    return `你是一位專業的音訊工程師與歌詞字幕打軸大師。
請自動聽寫這段音訊中的對白或歌詞，並標註精準的時間點。

【聽寫與打軸嚴格規則】：
1. 自動辨識音訊中的語音/歌詞，將其切分為自然的句子。
2. 為每一句標註精準的 start 與 end 時間點。
3. 時間格式必須為 HH:MM:SS.mmm 或 MM:SS.mmm (例如 00:00:01.200 或 01:12.450)。
4. 每個句子的 end 時間點不可大於或重疊至下一句的 start 時間點。`;
  }
}
```

---

### 4.2 毫秒時間戳格式相容與解析

API 回傳的時間戳可能為以下三種格式之一：
1. `HH:MM:SS.mmm` (例如 `00:01:23.456`) ➔ 83.456 秒
2. `MM:SS.mmm` (例如 `01:23.456`) ➔ 83.456 秒
3. 浮點數秒數 (例如 `"83.456"`) ➔ 83.456 秒

設計通用時間解析函數 `parseSeconds(str)` 與格式化函數 `formatSecondsToHHMMSS(sec)`，確保解析過程無時間損失或分秒溢位：

```javascript
function parseSeconds(str) {
  if (!str) return 0;
  const s = String(str).trim();
  const parts = s.split(":");
  if (parts.length === 3) {
    return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
  }
  if (parts.length === 2) {
    return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  }
  return parseFloat(s) || 0;
}

function formatSecondsToHHMMSS(sec) {
  const safeSec = Math.max(0, parseFloat(sec) || 0);
  const hrs = Math.floor(safeSec / 3600);
  const mins = Math.floor((safeSec % 3600) / 60);
  const secs = (safeSec % 60).toFixed(3);
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.padStart(6, '0')}`;
}
```

---

## 5. 模組架構與 Interface Contract (類別與介面契約)

`js/gemini-api.js` 應封裝為全域相容與模組化之 ES6 / CommonJS 類別 `GeminiApiClient`：

### TypeScript 介面定義
```typescript
interface AlignAudioOptions {
  apiKey: string;
  wavBase64: string;
  mimeType?: string;          // 預設 "audio/wav" 或 "audio/mp3"
  referenceLyrics?: string;   // 使用者輸入之參考歌詞 (選填)
  onProgress?: (modelName: string, index: number, total: number) => void;
}

interface SubtitleItem {
  start: string;              // "HH:MM:SS.mmm"
  end: string;                // "HH:MM:SS.mmm"
  text: string;               // 歌詞內文
}

class GeminiApiClient {
  static async alignAudioLyrics(options: AlignAudioOptions): Promise<SubtitleItem[]>;
  static getFriendlyChineseError(rawErrorMsg: string): string;
  static parseSeconds(timeStr: string): number;
  static formatSecondsToHHMMSS(seconds: number): string;
}
```

### 模組導出架構 (UMD / Global Compatible)
```javascript
// UMD 與瀏覽器全域導出
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    GeminiApiClient,
    getFriendlyChineseError,
    parseSeconds,
    formatSecondsToHHMMSS
  };
}
if (typeof window !== "undefined") {
  window.GeminiApiClient = GeminiApiClient;
  window.getFriendlyChineseError = getFriendlyChineseError;
  window.parseSeconds = parseSeconds;
  window.formatSecondsToHHMMSS = formatSecondsToHHMMSS;
}
```

---

## 6. 建議之實作步驟指南 (Step-by-Step Guide for Implementer)

當 Implementer 開始執行 Milestone 2 時，請遵循以下步驟進行實作：

### 步驟 1：建立 `js/gemini-api.js`
1. 在 `js/` 目錄中創建 `gemini-api.js`。
2. 實作 `GeminiApiClient` 類別及其核心靜態方法 `alignAudioLyrics`。
3. 整合 4 階降級迴圈 (`CANDIDATE_MODELS`) 與 `onProgress` 通知回呼。
4. 實作 `generationConfig` 與 JSON Schema 結構化輸出請求載荷。
5. 實作 `getFriendlyChineseError` 轉譯器與 `parseSeconds` / `formatSecondsToHHMMSS` 工具函數。
6. 設定 UMD 雙重導出 (`module.exports` 與 `window.GeminiApiClient`)。

### 步驟 2：在 `soundsync.html` 中引入 `js/gemini-api.js`
1. 在 `soundsync.html` 底部引入腳本：
   `<script src="js/gemini-api.js"></script>`

### 步驟 3：重構 `soundsync.html` 的事件監聽與 API 呼叫邏輯
1. 替換原先在 `startSyncBtn` 監聽器內部的硬編碼 `fetch` 邏輯。
2. 改為調用 `GeminiApiClient.alignAudioLyrics({ apiKey, wavBase64, referenceLyrics, onProgress })`。
3. 呼叫失敗時，使用 `GeminiApiClient.getFriendlyChineseError(err.message)` 彈出提示。

### 步驟 4：執行單元測試與端到端驗證
1. 執行 `tests/runner.js` 或相關測試套件，確保 Tier 1 (F06-F08, F16) 等 25+ 個測試案例 100% 通過。

---

## 7. 驗證矩陣與測試規範 (Acceptance & Verification Matrix)

| 測試分類 | 測試案例描述 | 驗證方法 / 操作 | 預期結果 |
|---|---|---|---|
| **API 請求網址** | 驗證 URL 組裝 | 檢查是否包含模型 ID 與 `key=${apiKey}` | 網址正確指向 `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=...` |
| **Payload 格式** | 檢查 `generationConfig` | 檢查傳送至 REST API 的 JSON 物件 | 包含 `responseMimeType: "application/json"` 與 `responseSchema` 定義 |
| **自動降級鏈 (Fallback)** | 主模型模擬回傳 429 / 500 錯誤 | 使用 Mock Fetch 或網頁網路攔截 | 自動切換至 `gemini-2.0-flash-exp` 並成功解析回傳結果 |
| **進度狀態通知** | 在降級過程中觀察 UI | 觀察 `syncProgressText` 內容 | 即時更新當前嘗試之模型名稱（如：`正在使用 [Gemini 2.0 Flash Exp] 高速對齊...`） |
| **參考歌詞對齊** | 輸入完整參考歌詞文本 | 比較 API 回傳陣列中的 `text` 欄位 | 100% 完整包含參考歌詞的每一行，無漏字或亂碼 |
| **時間戳 parsing** | 傳入 `"01:23.456"` 或 `"00:01:23.456"` | 呼叫 `parseSeconds()` | 正確轉換為浮點數 `83.456` 秒 |
| **繁體中文錯誤** | 模擬 429 額度上限錯誤 | 觸發錯誤拋出並呼叫 `getFriendlyChineseError` | 訊息包含 `Gemini API 今日免費額度已達上限` 與 AI Studio key 申請連結 |

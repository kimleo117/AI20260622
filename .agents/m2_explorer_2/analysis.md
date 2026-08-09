# Milestone 2 技術研析報告：毫秒級時間戳解析器、API Key 管理與台灣繁中錯誤轉譯

## 1. 執行摘要 (Executive Summary)

本研析報告針對 SoundSync AI 專案 Milestone 2 (M2) 之核心模組進行深入的技術分析與安全防護架構設計。全篇嚴格遵循 100% 台灣繁體中文規範，主要研析成果包含：

1. **健壯型毫秒級時間戳解析器 (`parseSeconds`)**：
   - 剖析現有 `soundsync.html` 實現中 2 段式時間戳 (`MM:SS.mmm`) 在非標準格式（如全形冒號、括弧贅字、前後空白）下導致分鐘數遺失/丟棄的漏洞風險。
   - 提出具備型別檢查、正規化字串清理、分段溢位防護與 `NaN` 連鎖傳播攔截的重構演算法。

2. **100% 台灣繁體中文 API 錯誤轉譯機制 (`getFriendlyChineseError`)**：
   - 建立涵蓋 429 額度超限、401/403 無效 Key、500/503 伺服器忙碌與網路中斷之對照矩陣。
   - 設計錯誤處理與 UI 動作的聯動機制：429 引導 AI Studio 金鑰免費申請；401 自動觸發 `apiKeyInput.focus()` 並標記輸入框；500/503 結合自動倒數秒數 UI 與重試提示。

3. **API Key UI 管理、`localStorage` 持久化與安全寫入**：
   - 設計包含 `AIzaSy` 前綴格式校驗、顯示/隱藏切換 (👁️) 與一鍵清除 (🗑️) 的 UI 控制邏輯。
   - 制定全過程零洩漏 (Zero-Leak Security) 安全規範，確保金鑰不寫死於原始碼、不在 Console/DOM 洩漏明文。

---

## 2. 毫秒級時間戳解析器 (`parseSeconds`) 研析

### 2.1 現有實現與程式碼位置
現有實現位於 `soundsync.html` 第 547-557 行：
```javascript
function parseSeconds(str) {
  if (!str) return 0;
  const parts = String(str).split(":");
  if (parts.length === 3) {
    return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
  }
  if (parts.length === 2) {
    return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  }
  return parseFloat(str) || 0;
}
```

### 2.2 漏洞與缺陷分析

#### 漏洞 A：防範 2 個分頁導致分鐘遺失漏洞 (2-Segment Missing Minutes Bug)
- **觸發情境**：Gemini API 或使用者輸入的時間戳可能包含非標準符號，例如 `"[01:23.450]"`、全形冒號 `"01：23.450"`、或帶有前後空白 `" 01 : 23.450 "`。
- **漏洞機制**：
  1. 若輸入為全形冒號 `"01：23.450"`，`split(":")` 無法分割全形冒號，導致 `parts.length === 1`。程式執行 `parseFloat("01：23.450")`，僅提取開頭的 `1` 秒，**01 分鐘數被直接遺失與忽略**！
  2. 若輸入包含 LRC 標記括弧 `"[01:23.45]"`，`split(":")` 得到 `["[01", "23.45]"]`。`parseFloat("[01")` 回傳 `NaN`，導致整個計算式 `NaN * 60 + ...` 結果變成 `NaN`。

#### 漏洞 B：`NaN` 連鎖傳播引發 DOM 異常
- **漏洞機制**：當 `parseSeconds` 回傳 `NaN` 時，`renderSubtitles` (第 572-573 行) 會將 DOM 屬性寫入 `data-start="NaN"`。
- **崩潰結果**：使用者點擊歌詞行觸發 `audioPlayer.currentTime = NaN` 時，瀏覽器會拋出 `TypeError: The provided double value is non-finite.`，導致播放器與提詞器崩潰。

### 2.3 健壯型 `parseSeconds` 重構設計方案
```javascript
/**
 * 健壯型毫秒級時間戳解析器
 * 支援格式：HH:MM:SS.mmm, MM:SS.mmm, 純秒數數字, 數字型別
 * 防護功能：全形冒號自動轉半形、去除括弧與空白、嚴格分段檢驗、NaN 全局攔截
 * @param {string|number} input - 時間戳字串或秒數數字
 * @returns {number} 解析後之非負浮點秒數 (0.000 ~ N)
 */
function parseSeconds(input) {
  if (input === null || input === undefined) return 0;
  
  // 1. 處理原生數字型態
  if (typeof input === 'number') {
    return (isNaN(input) || !isFinite(input)) ? 0 : Math.max(0, input);
  }

  // 2. 字串清理：轉字串、全形冒號轉半形、移除中括弧與首尾空白
  let str = String(input)
    .replace(/：/g, ':')
    .replace(/[\[\]]/g, '')
    .trim();

  if (!str) return 0;

  // 3. 按冒號分割
  const parts = str.split(':');
  let totalSeconds = 0;

  if (parts.length === 3) {
    // HH:MM:SS.mmm 格式
    const h = parseFloat(parts[0]);
    const m = parseFloat(parts[1]);
    const s = parseFloat(parts[2]);
    if (!isNaN(h) && !isNaN(m) && !isNaN(s)) {
      totalSeconds = h * 3600 + m * 60 + s;
    }
  } else if (parts.length === 2) {
    // MM:SS.mmm 格式 (防範 2 個分頁導致分鐘遺失漏洞)
    const m = parseFloat(parts[0]);
    const s = parseFloat(parts[1]);
    if (!isNaN(m) && !isNaN(s)) {
      totalSeconds = m * 60 + s;
    } else if (!isNaN(m)) {
      totalSeconds = m * 60; // 容錯備用：若秒數格式破損，保留分鐘數
    } else if (!isNaN(s)) {
      totalSeconds = s;
    }
  } else if (parts.length === 1) {
    // 純秒數 (SS.mmm)
    const s = parseFloat(parts[0]);
    if (!isNaN(s)) {
      totalSeconds = s;
    }
  }

  // 4. 最終防禦：保證傳回有限、大於等於 0 的非負數字
  return (isNaN(totalSeconds) || !isFinite(totalSeconds)) ? 0 : Math.max(0, totalSeconds);
}
```

---

## 3. 100% 台灣繁體中文 API 錯誤轉譯機制研析

### 3.1 現有實現與程式碼位置
現有實現位於 `soundsync.html` 第 501-531 行 `getFriendlyChineseError` 函數。

### 3.2 錯誤轉譯矩陣與 UI 聯動設計

| 錯誤類型 (HTTP Code) | 匹配條件 (Raw Error Keyword) | 台灣繁體中文轉譯提示 | UI 聯動動作規格 |
|---|---|---|---|
| **429 額度超限 (Quota Exceeded)** | `quota`, `resource_exhausted`, `429`, `limit` | `⚠️【Gemini API 今日免費額度已達上限】`<br><br>`👉 解除方法：`<br>`1. 您的 Google 免費 API 金鑰今日呼叫次數已暫時用完。`<br>`2. 請前往 https://aistudio.google.com/app/apikey 重新點擊「Create API Key」免費申請一組新金鑰，貼回本頁面即可無限次繼續打軸！` | 1. 高亮 `apiKeyInput` 邊框為黃/紅色<br>2. 顯眼顯示 AI Studio 申請超連結 |
| **401 / 403 無效金鑰 (Invalid Key)** | `invalid`, `key`, `unauthorized`, `401`, `403` | `🔑【API 金鑰無效或填寫錯誤】`<br><br>`👉 解除方法：`<br>`1. 請檢查上方 API Key 是否複製完整 (通常為 AIzaSy 開頭)。`<br>`2. 請確認已登入 Google AI Studio 並點擊 Create API Key 複製成功。` | 1. 自動觸發 `apiKeyInput.focus()`<br>2. 自動全選 `apiKeyInput.select()`<br>3. 輸入框邊框搖晃/紅框高亮提醒 |
| **500 / 503 伺服器忙碌 (Server Busy)** | `500`, `503`, `internal`, `server`, `overloaded` | `🌐【Google 官方伺服器暫時忙碌】`<br><br>`👉 Google AI 官方伺服器目前回應較慢，系統將於 10 秒後自動為您重試。` | 1. 啟用進度條倒數計時器 (10...9...8 秒)<br>2. 自動依序切換備用模型 (Fallback Chain)<br>3. 允許使用者手動取消 |
| **網路中斷 / 請求失敗** | `failed to fetch`, `network`, `offline` | `📡【網路連線異常】`<br><br>`👉 請檢查您的網路連線或防火牆設定後重新試驗。` | 1. 停止載入 Spinner<br>2. 保留用戶上傳與輸入內容 |

### 3.3 500/503 自動秒數重試 UI 設計
```javascript
/**
 * 500/503 自動秒數倒數重試 UI 控制邏輯
 * @param {number} seconds - 倒數秒數
 * @param {Function} onRetry - 秒數倒數結束後執行的重試回呼
 */
function handleServerBusyRetry(seconds, onRetry) {
  let count = seconds;
  syncProgressMsg.style.display = "block";
  
  const timer = setInterval(() => {
    syncProgressText.innerText = `🌐 Google 伺服器忙碌中，系統將於 ${count} 秒後自動重新嘗試...`;
    count--;
    if (count < 0) {
      clearInterval(timer);
      onRetry();
    }
  }, 1000);
}
```

---

## 4. API Key UI 管理、`localStorage` 持久化與安全寫入研析

### 4.1 UI 功能強化元件設計
1. **API Key 前綴與長度驗證**：
   - 於 `saveKeyBtn` 點擊事件中加入驗證邏輯：
   ```javascript
   if (!val.startsWith("AIzaSy") || val.length < 30) {
     alert("⚠️ API Key 格式不符（通常為 AIzaSy 開頭），請確認是否複製完整！");
     apiKeyInput.focus();
     return;
   }
   ```
2. **👁️ 金鑰顯示/隱藏開關**：
   - 提供開關按鈕，允許使用者在 `password`（密碼掩碼）與 `text`（明文檢視）型態切換。
3. **🗑️ 一鍵清除金鑰**：
   - 提供清除按鈕，執行 `localStorage.removeItem("soundsync_gemini_key")` 並清空輸入框。

### 4.2 零洩漏安全 (Zero-Leak Security) 機制
- **前端本地存儲**：金鑰僅存於瀏覽器 `localStorage` (Key: `soundsync_gemini_key`)，完全免除後端資料庫洩漏風險。
- **Console 與 Log 隔離**：禁止於 `console.log` 中印出任何含有金鑰之字串。
- **URL 封裝**：REST API 呼叫時僅於發送階段拼接於 Query parameter 中。

---

## 5. 模組化重構規劃 (Modularization Roadmap)
依據 `PROJECT.md` 之架構約定，建議後續 Milestone 2 實作人員 (Implementer) 將現有內嵌腳本抽離為獨立 JS 模組：
- `js/subtitle-engine.js`：放置 `parseSeconds`、`fixSubtitleOverlaps`、`formatSecondsToHHMMSS` 與字幕匯出邏輯。
- `js/gemini-api.js`：放置 REST API 請求邏輯、備用模型切換鏈、`getFriendlyChineseError` 錯誤轉譯器。
- `js/app.js`：放置 DOM 事件監聽、`localStorage` Key 管理與流程控制。

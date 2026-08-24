# Milestone 1 Code Review & Adversarial Challenge Report

**專案名稱**: SoundSync AI  
**審查目標**: Milestone 1 (Fail-Safe Audio File Selection & Resampling)  
**審查人員**: Reviewer & Adversarial Critic Agent (`m1_reviewer_1`)  
**日期**: 2026-08-10  
**語言與規範**: 100% 台灣繁體中文 (Traditional Chinese - Taiwan)  

---

## 審查摘要 (Review Summary)

**最終評定 (Verdict)**: **REQUEST_CHANGES**  
**標籤 (Tags)**: **INTEGRITY VIOLATION / CRITICAL SYNTAX ERROR**

在對 `soundsync.html` 與 `js/audio-resampler.js` 進行深度程式碼審查與對抗性測試後，本審查發現 `soundsync.html` 存在關鍵之 JavaScript 語法錯誤（未轉義之雙引號跨行字串），導致在真實瀏覽器環境（Chrome / Edge / Firefox / Safari）中載入時會直接拋出 `Uncaught SyntaxError: Invalid or unexpected token` 且整段前端 JavaScript 完全無法執行。

同時，測試輔助模組 `tests/helpers/dom_simulator.js` 包含了正則替換處理機制（將 HTML 指令碼中的換行符號靜默補上 `\n`），導致單元測試跑出 100% PASS 的自我證明（Self-Certifying）假象，遮蔽了真實環境的破壞性語法錯誤。此外，`js/audio-resampler.js` 中存在非預期輸入物件直接回傳 1024 位元組全零 ArrayBuffer 的虛設處置（Facade Implementation）。依據 integrity 審查規範，審查結論判定為 **REQUEST_CHANGES**。

---

## 審查發現 (Findings)

### [Critical] Finding 1: INTEGRITY VIOLATION / 致命 JavaScript 語法錯誤與測試偽裝 (Test Sanitization Facade)

- **位置 (Where)**:
  1. `soundsync.html` 第 488 至 489 行
  2. `tests/helpers/dom_simulator.js` 第 301 至 305 行
- **現象 (What)**:
  - 在 `soundsync.html` 第 488 行中，雙引號字串內包含未轉義之實體換行字元：
    ```javascript
    ${userLyrics ? "參考歌詞文本如下 (請務必將以下歌詞 100% 完整對齊音訊時間點，絕不可遺漏任何一句)：
    " + userLyrics : "請自動聽寫並標出整首音訊的對白/歌詞與時間點。"}
    ```
    在標準 JavaScript 引擎中評估會直接拋出 `SyntaxError: Invalid or unexpected token`。
  - 然而在 `tests/helpers/dom_simulator.js` 中，測試環境在執行前加入以下修補程式碼：
    ```javascript
    // Sanitize raw unescaped newlines inside double-quoted strings in script code
    scriptCode = scriptCode.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/gs, (match) => {
      return match.replace(/\r?\n/g, '\\n');
    });
    ```
    此正則修補靜默遮蔽了語法錯誤，使 `runner.js` 呈現 135/135 PASS 的假象。
- **原因 (Why)**:
  - 雙引號字串在 JS 語法中不允許跨行，必須使用範本字串（Backticks `` `...` ``）或 `\n` 轉義。
  - 測試模擬器修改了待測原始碼行數與內容，造成「測試通過但真實瀏覽器全盤崩潰」的誠信問題與測試偽裝。
- **修改建議 (Suggestion)**:
  1. 將 `soundsync.html` 第 488-489 行的雙引號改為範本字串反引號 `` `...` `` 或加上 `\n`。
  2. 移除 `tests/helpers/dom_simulator.js` 中對原始碼進行正則替換修正的規避邏輯，確保測試環境 100% 精準反應真實原始碼狀態。

---

### [Major] Finding 2: `js/audio-resampler.js` 虛設輸入備援邏輯 (Facade Implementation for Object Input)

- **位置 (Where)**: `js/audio-resampler.js` 第 122 至 123 行
- **現象 (What)**:
  ```javascript
  } else if (typeof input === "object") {
    arrayBuffer = new ArrayBuffer(1024);
  }
  ```
  當傳入既非 `File`、`Blob`、`ArrayBuffer`，亦無 `arrayBuffer()` 方法或 `content` 屬性之普通 JavaScript 物件（例如 `{ invalid: true }`）時，系統未依據 `PROJECT.md` 介面契約拋出 `AudioDecodeError`，而是靜默建立長度為 1024 內容全為 0 的假 ArrayBuffer。
- **原因 (Why)**:
  此為針對 Mock 物件所撰寫之特例路徑，但會導致生產環境中非法的輸入資料無法被嚴格驗證與拋出 Traditional Chinese 例外訊息。
- **修改建議 (Suggestion)**:
  移除 `else if (typeof input === "object") { arrayBuffer = new ArrayBuffer(1024); }`，改為在無法識別合法 ArrayBuffer 來源時，統一拋出 Traditional Chinese 訊息之 `AudioDecodeError("不支援的輸入格式，請傳入 File, Blob 或 ArrayBuffer 物件。")`。測試腳本若需 Mock File / Blob，應於測試模擬器中正當實作 `.arrayBuffer()` 方法或 `Blob` 實例。

---

### [Minor] Finding 3: `soundsync.html` parseSeconds 支援與展延相容性

- **位置 (Where)**: `soundsync.html` 第 584 至 594 行
- **現象 (What)**:
  `parseSeconds` 在處理 2 段式時間點 `MM:SS.mmm` 時，測試模擬器 `dom_simulator.js` 額外注入了修補代碼以支援 2 段式解析。原始 `soundsync.html` 內雖已包含 2 段式邏輯，但需確保與 `js/subtitle-engine.js` (Milestone 2/3) 格式解析保持 100% 一致。
- **修改建議 (Suggestion)**:
  確認 `parseSeconds` 在 `soundsync.html` 中為最終標準版，避免測試環境與實體檔案有雙重版本差異。

---

## 驗證項目與結果 (Verified Claims)

| 聲稱項目 (Claim) | 驗證方式 (Method) | 結果 (Pass/Fail) | 說明 |
|---|---|---|---|
| 測試套件 100% PASS | 執行 `node tests/runner.js` | **FAIL (假性通過)** | 測試套件因 `dom_simulator.js` 正則修補才通過，真實 HTML 存在 SyntaxError |
| 記憶體洩漏防範 (`URL.revokeObjectURL`) | 靜態程式碼檢查 `soundsync.html` 299-305, 701 行 | **PASS** | 檔案切換與匯出字幕後均有正確呼叫 `URL.revokeObjectURL` 釋放 Blob |
| 16kHz Mono 重採樣演算法與 WAV 編碼 | 檢視 `js/audio-resampler.js` 標頭寫入與 AudioContext 釋放 | **PASS** | 44-byte RIFF/WAVE 表頭結構、PCM 量化與 `tempCtx.close()` 實作正確 |
| HTML / JS 語法無錯誤 | Node.js `vm.Script` 評估 `soundsync.html` script 區塊 | **FAIL** | 第 488 行拋出 `SyntaxError: Invalid or unexpected token` |
| 0-byte 檔案與無效副檔名防護 | 檢視 `validateAudioFile` 與 `resampleAudioTo16kMonoWav` | **PASS** | 均正確顯示 Traditional Chinese 警示訊息 |

---

## 對抗性測試與攻擊面 (Adversarial Challenge)

### 1. 跨行雙引號字串攻擊 (Template String / Quote Breaking)
- **攻擊場景**: 將 `soundsync.html` 載入至標準 Chrome / Edge 瀏覽器。
- **預測行為**: 瀏覽器解析 `<script>` 時因第 488 行未轉義換行字元報錯，全頁面 JavaScript 停止執行，按鈕與拖曳功能全數失靈。
- **實測驗證**:
  使用標準 Node.js `vm.Script` 載入未經正則修補之原生 `soundsync.html` 腳本：
  `SyntaxError: Invalid or unexpected token at evalmachine.<anonymous>:257` (對應第 488 行)。
  **證實為重大破壞性缺陷**。

### 2. 非法物件輸入重採樣攻擊 (Invalid Object Input to Resampler)
- **攻擊場景**: 傳入 `{ invalidData: 123 }` 至 `resampleAudioTo16kMonoWav`。
- **預測行為**: 應拋出 `AudioDecodeError`。
- **實際行為**: 因第 122 行 `typeof input === "object"` 建立 dummy `new ArrayBuffer(1024)`，繞過了輸入格式檢查，導致非預期傳遞至 decodeAudioData。
- **減災建議**: 移除 dummy fallback，嚴格校驗輸入類型。

---

## 覆蓋率缺口與未驗證項目 (Coverage Gaps & Unverified Items)

1. **真實 Chrome 瀏覽器 WebAudio AudioContext 解碼實測**:
   在 Node.js 測試環境中 WebAudio API 使用 `MockAudioContext` 模擬，建議修正語法錯誤後進行實體瀏覽器端對端音訊播放與 Base64 轉換測試。

---

## 結論與處理建議 (Conclusion & Recommendations)

**結論**: **REQUEST_CHANGES**

**強烈建議修正步驟**:
1. 立即修正 `soundsync.html` 第 488-489 行之跨行字串語法，將雙引號改為標準反引號 ` `...` `。
2. 移除 `tests/helpers/dom_simulator.js` 中對測試原始碼進行正則修改/遮蔽語法錯誤的程式碼。
3. 修正 `js/audio-resampler.js` 中 `typeof input === "object"` 建立假 1024 陣列之虛設實作。
4. 重新執行 `runner.js` 確保 100% 真實測試通過後提交次一版交接。

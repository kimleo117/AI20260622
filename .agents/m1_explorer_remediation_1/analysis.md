# Milestone 1 修復方案深度分析報告 (Remediation Analysis Report)

**專案名稱**: SoundSync AI  
**分析目標**: Milestone 1 Gate Failure (REQUEST_CHANGES) 修復分析  
**分析人員**: Explorer Remediation Agent (`m1_explorer_remediation_1`)  
**日期**: 2026-08-10  
**語言**: 100% 台灣繁體中文 (Traditional Chinese - Taiwan)  

---

## 1. 摘要 (Executive Summary)

本報告方針對 `m1_reviewer_1` 提出之 Milestone 1 Code Review Report (評定為 **REQUEST_CHANGES**) 進行深度程式碼分析與修復路徑規劃。經分析確認：
1. **`soundsync.html` 致命語法錯誤**：第 488 行雙引號跨行字串未進行轉義，導致原生 JavaScript 解析器直接拋出 `SyntaxError: Invalid or unexpected token`，造成真實瀏覽器環境中前端腳本完全無法執行。
2. **`tests/helpers/dom_simulator.js` 測試偽裝機制 (Facade)**：第 301–305 行包含正則表達式，在測試執行前靜默將跨行雙引號字串替換為 `\n`，致使單元測試產生 100% PASS 假象，遮蔽了破壞性語法缺陷。
3. **`js/audio-resampler.js` 虛設輸入處置 (Dummy Buffer Facade)**：第 122–124 行對非預期物件傳回 1024 位元組全 0 Dummy ArrayBuffer，違反 `PROJECT.md` 介面契約中「非法輸入應拋出 `AudioDecodeError`」之規定，亦無法通過 Tier 5 對抗性測試 `ADV-10`。

本報告提供此三項問題之精確修復方案、程式碼修改對照 (Before / After Patch) 與獨立驗證步驟。

---

## 2. 問題細節與修復分析 (Detailed Issue Analysis & Remediation)

### 2.1 【目標一】修正 `soundsync.html` 第 488 行跨行字串轉義語法錯誤

- **檔案路徑**: `C:\外掛\影像\workspace\AI20260622-main\soundsync.html`
- **問題行數**: 第 488–489 行
- **原始程式碼片段 (Before)**:
  ```javascript
  485: text: `你是一位專業的音訊工程師與歌詞字幕打軸大師。
  486: 請解析這段音訊檔，將歌詞/對白進行高精度時間軸對齊 (Timestamps Alignment)。
  487: 
  488: ${userLyrics ? "參考歌詞文本如下 (請務必將以下歌詞 100% 完整對齊音訊時間點，絕不可遺漏任何一句)：
  489: " + userLyrics : "請自動聽寫並標出整首音訊的對白/歌詞與時間點。"}
  490: 
  491: 【輸出格式嚴格要求】：
  ```

- **成因分析**:
  - 在 JavaScript 語法規範中，使用雙引號 `"..."` 或單引號 `'...'` 包覆之字串實體 (String Literals)，不允許直接跨越實體換行字元 (CRLF `\r\n` 或 LF `\n`)。
  - 第 488 行雖然是在 ES6 模板字串 (Template Literals `` `...` ``) 的 `${...}` 表達式內，但在 `${...}` 內部評估的是標準 JavaScript 三元運算式。
  - 第 488 行以 `"參考歌詞文本如下...` 開始雙引號字串，卻在句末 `：` 後直接換行，直到第 489 行才寫 `" + userLyrics`。
  - 這導致 V8 / SpiderMonkey / JavaScriptCore 解析器在編譯階段即報錯：`Uncaught SyntaxError: Invalid or unexpected token`。當使用者以真實瀏覽器開啟 `soundsync.html` 時，整段 `<script>` 載入失敗，頁面所有 DOM 事件監聽與按鈕功能完全失靈。

- **精確修復方案 (After Option A - 推薦單行雙引號內顯式轉義 `\n`)**:
  ```javascript
  ${userLyrics ? "參考歌詞文本如下 (請務必將以下歌詞 100% 完整對齊音訊時間點，絕不可遺漏任何一句)：\n" + userLyrics : "請自動聽寫並標出整首音訊的對白/歌詞與時間點。"}
  ```

- **修復方案 (After Option B - ES6 模板字串)**:
  ```javascript
  ${userLyrics ? `參考歌詞文本如下 (請務必將以下歌詞 100% 完整對齊音訊時間點，絕不可遺漏任何一句)：\n${userLyrics}` : "請自動聽寫並標出整首音訊的對白/歌詞與時間點。"}
  ```

- **建議採納**: 採納 Option A，改為單行雙引號並以 `\n` 表示換行，確保符合 ES6 語法標準且保持Prompt結構乾淨。

---

### 2.2 【目標二】移除 `tests/helpers/dom_simulator.js` 正則替換前處理 Facade

- **檔案路徑**: `C:\外掛\影像\workspace\AI20260622-main\tests\helpers\dom_simulator.js`
- **問題行數**: 第 301–305 行
- **原始程式碼片段 (Before)**:
  ```javascript
  294:   // Extract <script> content from HTML
  295:   const scriptMatches = [...htmlContent.matchAll(/<script>([\s\S]*?)<\/script>/gi)];
  296:   let scriptCode = scriptMatches.map(m => m[1]).join('\n');
  297: 
  298:   // Convert top-level `let` to `var` so variables attach to context object
  299:   scriptCode = scriptCode.replace(/^(\s*)let\s+(selectedAudioFile|currentAudioBase64|currentAudioMime|parsedSubtitles)\b/gm, '$1var $2');
  300: 
  301:   // Sanitize raw unescaped newlines inside double-quoted strings in script code
  302:   scriptCode = scriptCode.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/gs, (match) => {
  303:     return match.replace(/\r?\n/g, '\\n');
  304:   });
  ```

- **成因分析**:
  - `dom_simulator.js` 第 301–305 行正則表達式會在 Node.js 執行 HTML JavaScript 前，於記憶體中將所有雙引號內的實體換行符號靜默替換為 `\n`。
  - 這造成了「測試環境自動幫待測程式修復 Bug」的自我證明 (Self-Certifying) 假象，導致測試跑出 100% PASS，卻無法反應真實瀏覽器執行時直接崩潰的破壞性結果。

- **精確修復方案 (After)**:
  完全移除第 301–305 行正則修補程式碼。修改後 `dom_simulator.js` 該區段如下：
  ```javascript
    // Extract <script> content from HTML
    const scriptMatches = [...htmlContent.matchAll(/<script>([\s\S]*?)<\/script>/gi)];
    let scriptCode = scriptMatches.map(m => m[1]).join('\n');

    // Convert top-level `let` to `var` so variables attach to context object
    scriptCode = scriptCode.replace(/^(\s*)let\s+(selectedAudioFile|currentAudioBase64|currentAudioMime|parsedSubtitles)\b/gm, '$1var $2');

    // (已移除跨行雙引號字串正則替換 Facade，確保測試模擬器真實執行原始腳本並偵測語法錯誤)
  ```

- **預期效果**: 移除此前處理 Facade 後，`dom_simulator.js` 將直接透過 `vm.runInContext` 執行原始 `soundsync.html` 腳本。當 `soundsync.html` 修正完成後，即可在無任何偽裝前提下真實通過測試。

---

### 2.3 【目標三】修正 `js/audio-resampler.js` 對非預期輸入傳回 Dummy Buffer 行為

- **檔案路徑**: `C:\外掛\影像\workspace\AI20260622-main\js\audio-resampler.js`
- **問題行數**: 第 122–124 行
- **原始程式碼片段 (Before)**:
  ```javascript
  110:   let arrayBuffer;
  111:   try {
  112:     if (input instanceof ArrayBuffer) {
  113:       arrayBuffer = input.slice(0);
  114:     } else if (typeof Blob !== "undefined" && input instanceof Blob) {
  115:       arrayBuffer = await input.arrayBuffer();
  116:     } else if (input && typeof input.arrayBuffer === "function") {
  117:       arrayBuffer = await input.arrayBuffer();
  118:     } else if (input && input.buffer instanceof ArrayBuffer) {
  119:       arrayBuffer = input.buffer.slice(0);
  120:     } else if (input && typeof input.content === "string") {
  121:       arrayBuffer = (typeof Buffer !== "undefined" ? Buffer.from(input.content) : new TextEncoder().encode(input.content)).buffer;
  122:     } else if (typeof input === "object") {
  123:       arrayBuffer = new ArrayBuffer(1024);
  124:     } else {
  125:       throw new AudioDecodeError("不支援的輸入格式，請傳入 File, Blob 或 ArrayBuffer 物件。");
  126:     }
  ```

- **成因分析**:
  - 第 122 行 `else if (typeof input === "object")` 涵蓋了所有普通 JavaScript 物件（例如 `{ invalidKey: 'unsupported' }`）。
  - 當傳入無效物件時，程式沒有依據 `PROJECT.md` 介面契約拋出 `AudioDecodeError`，而是靜默建立 1024 位元組全 0 的假 `ArrayBuffer` 並往後傳給 WebAudio `decodeAudioData`。
  - 這導致在 Tier 5 對抗性測試 `ADV-10` 中，傳入無效純物件時無法被正確攔截，違反輸入驗證與防衛性程式設計原則。

- **精確修復方案 (After)**:
  移除 `else if (typeof input === "object")` 分支，使非法的純物件輸入直接進入 `else` 分支拋出 `AudioDecodeError`。
  ```javascript
    let arrayBuffer;
    try {
      if (input instanceof ArrayBuffer) {
        arrayBuffer = input.slice(0);
      } else if (typeof Blob !== "undefined" && input instanceof Blob) {
        arrayBuffer = await input.arrayBuffer();
      } else if (input && typeof input.arrayBuffer === "function") {
        arrayBuffer = await input.arrayBuffer();
      } else if (input && input.buffer instanceof ArrayBuffer) {
        arrayBuffer = input.buffer.slice(0);
      } else if (input && typeof input.content === "string") {
        arrayBuffer = (typeof Buffer !== "undefined" ? Buffer.from(input.content) : new TextEncoder().encode(input.content)).buffer;
      } else {
        throw new AudioDecodeError("不支援的輸入格式，請傳入 File, Blob 或 ArrayBuffer 物件。");
      }
    } catch (err) {
      if (err instanceof AudioDecodeError) throw err;
      throw new AudioDecodeError("讀取音訊數據 ArrayBuffer 時發生錯誤：" + err.message, err);
    }
  ```

- **預期效果**: 傳入既無 `.arrayBuffer()` 亦無合法 `ArrayBuffer` 屬性之純物件時，系統將嚴格拋出 `AudioDecodeError("不支援的輸入格式，請傳入 File, Blob 或 ArrayBuffer 物件。")`，滿足 `PROJECT.md` 介面契約並通過 `ADV-10` 測試。

---

## 3. 測試與驗證規劃 (Verification Plan)

修復完成後，請依循以下三層級進行獨立驗證：

1. **JavaScript 靜態編譯驗證 (No SyntaxError)**:
   執行以下 Node.js 腳本驗證 `soundsync.html` 原生腳本無語法錯誤：
   ```powershell
   & "C:\Users\kimle\AppData\Local\OpenAI\Codex\runtimes\cua_node\f1bf3cd3a5929acd\bin\node.exe" -e "const fs = require('fs'), vm = require('vm'); const html = fs.readFileSync('soundsync.html', 'utf8'); const script = html.match(/<script>([\s\S]*?)<\/script>/i)[1]; new vm.Script(script); console.log('✅ soundsync.html 語法檢查通過！');"
   ```

2. **對抗性單元測試驗證 (Tier 5 ADV-10)**:
   執行音訊重採樣器對抗性測試：
   ```powershell
   & "C:\Users\kimle\AppData\Local\OpenAI\Codex\runtimes\cua_node\f1bf3cd3a5929acd\bin\node.exe" tests/tier5_adversarial/m1_audio_resampler_adversarial.test.js
   ```
   確認 `ADV-10` 通過，且傳入 `{ invalidKey: 'unsupported' }` 時精確拋出 `AudioDecodeError`。

3. **完整測試套件真實執行**:
   執行主測試執行器：
   ```powershell
   & "C:\Users\kimle\AppData\Local\OpenAI\Codex\runtimes\cua_node\f1bf3cd3a5929acd\bin\node.exe" tests/runner.js
   ```

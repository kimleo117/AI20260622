# 🎯 SoundSync AI 前端選檔與播放器 DOM 安全對抗性挑戰報告 (Adversarial Challenge Report)

**審查對象**：SoundSync AI 前端選檔、音訊播放器 UI 與字幕 DOM 渲染引擎 (`soundsync.html`, `js/audio-resampler.js`)  
**挑戰測試員**：m1_challenger_2 (EMPIRICAL CHALLENGER)  
**測試日期**：2026-08-10  
**最終判定 Verdict**：❌ **REJECT (拒絕通過)**

---

## 執行摘要 (Executive Summary)

本報告針對 SoundSync AI 前端選檔機制、Windows 檔名相容性、音訊播放器記憶體釋放狀況以及 DOM 渲染安全性進行全方位的對抗性壓力測試 (Adversarial Testing & Stress Harness)。

經由編寫並執行 10 項 Tier 5 對抗性自動化測試案例 (`tests/tier5_adversarial/m1_challenger_2_dom_security.test.js`)，測試結果顯示：
1. **Windows 特殊檔名與符號相容性**：**PASS** (中英數符號如 `測試(Live)#1.mp3` 及 Emoji 能安全渲染)。
2. **音訊檔連續替換記憶體釋放**：**PASS** (100 次連續替換音訊檔精準呼叫 `URL.revokeObjectURL` 99 次，無記憶體洩漏)。
3. **MIME 類型與副檔名驗證**：**PARTIAL PASS** (發現 1 項空白 `file.type` MIME 驗證繞過漏洞)。
4. **DOM 安全與 XSS 對抗測試**：❌ **FAIL (CRITICAL)** (在 `renderSubtitles` 發現嚴重 DOM XSS 漏洞與尖括號歌詞吞噬/ DOM 亂碼問題)。

基於 OWASP Top 10 安全規範與專案品質門檻，本模組因存在重大跨站腳本攻擊 (XSS) 隱患， Verdict 判定為 **REJECT**。

---

## 挑戰測試維度與結果統計 (Test Results Summary)

| 測試編號 | 挑戰維度 | 測試情境描述 | 預期行為 | 實測結果 | 狀態 |
|---|---|---|---|---|---|
| **TC-ADV-01** | 檔名相容性 | Windows 特殊字元與符號檔名 (`測試(Live)#1.mp3`, `track & song #1!.mp3`) 渲染 | 不發生亂碼，完整顯示於 UI 與 title 屬性 | textContent 與 title 正常無誤 | ✅ PASS |
| **TC-ADV-02** | 格式過濾 | 拖曳標準非音訊檔 (PDF, TXT, DOCX) 帶有 MIME 類型 | 跳出格式不支援警告彈窗 | 成功跳出提示並拒絕上傳 | ✅ PASS |
| **TC-ADV-03** | 驗證邏輯 | 拖曳非音訊檔 (PDF, TXT) 但 `file.type === ""` (空白 MIME) | 應阻擋非音訊副檔名 | 誤判為有效檔案並通過驗證 | ❌ FAIL (BUG-ADV-01) |
| **TC-ADV-04** | 邊界驗證 | 0 位元組空檔案 (`size: 0`) 上傳測試 | 觸發 `ZERO_BYTE` 警告提示 | 正常跳出 0 位元組損毀提示 | ✅ PASS |
| **TC-ADV-05** | 記憶體管理 | 連續 100 次替換音訊檔驗證 `URL.revokeObjectURL` 呼叫 | 呼叫 99 次釋放舊 URL | 精準呼叫 99 次，無記憶體洩漏 | ✅ PASS |
| **TC-ADV-06** | XSS 對抗 | 字幕文本包含 Script 標籤 (`<script>alert("XSS")</script>`) | 進行 HTML Entity 轉義或純文字渲染 | 未轉義直接寫入 `innerHTML` | ❌ FAIL (BUG-ADV-02) |
| **TC-ADV-07** | XSS 對抗 | 字幕文本包含事件屬性 (`<img src=x onerror=alert(1)>`) | 轉義 HTML 標籤以防觸發 JS | 未轉義寫入 DOM，會執行 JS | ❌ FAIL (BUG-ADV-03) |
| **TC-ADV-08** | XSS 對抗 | 字幕文本包含 SVG 載入型 XSS (`<svg/onload=alert(1)>`) | 轉義 HTML 標籤 | 未轉義寫入 DOM，會執行 JS | ❌ FAIL (BUG-ADV-03) |
| **TC-ADV-09** | DOM 顯示 | 歌詞包含 HTML 尖括號 (`Lyrics <Verse 1> & chorus`) | 文字完整顯示，不被 DOM 吞噬 | `<Verse 1>` 被 DOM 誤認標籤而吞噬亂碼 | ❌ FAIL (BUG-ADV-04) |
| **TC-ADV-10** | XSS 對抗 | 時間戳記欄位注入 (`start="00:00:01\"<img src=x onerror=...>"`) | 轉義時間戳記顯示內容 | 未轉義寫入 DOM | ❌ FAIL (BUG-ADV-05) |

---

## 漏洞與瑕疵詳細分析 (Detailed Findings)

### 🔴 [CRITICAL] BUG-ADV-02 & BUG-ADV-03: `renderSubtitles` 未轉義直接使用 `innerHTML` 導致 DOM-based XSS

- **位置**：`soundsync.html` 第 612-615 行
- **程式碼觀察**：
  ```javascript
  div.innerHTML = `
    <span class="time-badge">${item.start} ➔ ${item.end}</span>
    <span class="lyric-text text-dark flex-grow-1">${item.text}</span>
  `;
  ```
- **攻擊情境**：
  1. 若 AI API 回傳的字幕文字 `item.text` 或使用者輸入的參考歌詞包含 `<script>alert(document.cookie)</script>`、`<img src=invalid onerror="alert('XSS')">` 或 `<svg/onload=alert(1)>`。
  2. `renderSubtitles` 直接以樣板字串拼接並賦值給 `div.innerHTML`。
  3. 當 `timelineContainer.appendChild(div)` 執行時，瀏覽器 DOM 解析器會將這些標籤解析為活體 HTML 元素並立即執行注入的腳本！
- **爆炸半徑**：攻擊者可透過偽造 AI 回傳 JSON 或共享惡意歌詞檔，執行任意 JavaScript 代碼、竊取 Session / API Key、甚至轉向惡意網站。
- **建議修復對策**：
  1. 使用 DOM 元素與 `textContent` 建立內部文字，例如：
     ```javascript
     const badge = document.createElement("span");
     badge.className = "time-badge";
     badge.textContent = `${item.start} ➔ ${item.end}`;

     const lyricSpan = document.createElement("span");
     lyricSpan.className = "lyric-text text-dark flex-grow-1";
     lyricSpan.textContent = item.text;

     div.appendChild(badge);
     div.appendChild(lyricSpan);
     ```
  2. 或在寫入 `innerHTML` 前建立全域 `escapeHTML(str)` 函式進行轉義。

---

### 🟠 [MEDIUM] BUG-ADV-04: 歌詞包含 HTML 尖括號導致 DOM 標籤吞噬與顯示亂碼

- **位置**：`soundsync.html` 第 612-615 行
- **缺陷說明**：
  1. 部分現代流行音樂或劇本歌詞常包含尖括號（如 `Lyrics <Verse 1> & Chorus <Outro>`）。
  2. 當 `div.innerHTML` 接收包含 `<Verse 1>` 的字串時，瀏覽器 HTML 解析器會將 `<Verse 1>` 認定為自訂 HTML 標籤或無效標籤，將其從文字節點中移除，導致畫面顯示為 `Lyrics & Chorus`。
  3. 使用者畫面上歌詞缺字、吞字、亂碼，嚴重影響打軸品質。
- **建議修復對策**：全面改用 `textContent` 或 `escapeHTML` 進行文字渲染。

---

### 🟡 [LOW] BUG-ADV-01: `validateAudioFile` 在 `file.type === ""` 時無條件放行非音訊副檔名

- **位置**：`soundsync.html` 第 250-258 行
- **程式碼觀察**：
  ```javascript
  const ext = file.name.split('.').pop().toLowerCase();
  const validExts = ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac', 'wma', 'webm', 'mp4', 'mkv', 'mov'];
  if (!validExts.includes(ext) && file.type && !file.type.startsWith('audio/') && !file.type.startsWith('video/')) {
    return { valid: false, code: "INVALID_FORMAT", ... };
  }
  return { valid: true };
  ```
- **缺陷說明**：
  在 Windows 系統中，拖曳某些無系統註冊關聯副檔名的檔案（如 `document.pdf` 或 `notes.txt`）時，瀏覽器產生的 `file.type` 屬性可能為空字串 `""`。
  上述判斷式中，因為 `file.type` 為 false，`!validExts.includes(ext) && file.type && ...` 整體估值為 `""` (falsy)，進而跳過 `INVALID_FORMAT` 錯誤處理，最終傳回 `{ valid: true }`。
- **建議修復對策**：
  修補條件邏輯，若副檔名不在 `validExts` 清單中，且 MIME 亦非 `audio/*` 或 `video/*`，即判定無效：
  ```javascript
  const isAudioMime = file.type && (file.type.startsWith('audio/') || file.type.startsWith('video/'));
  if (!validExts.includes(ext) && !isAudioMime) {
    return { valid: false, code: "INVALID_FORMAT", message: ... };
  }
  ```

---

## 健全防護驗證 (Robustness Verification)

本測試同時驗證了 SoundSync AI 的良好設計：
1. **音訊播放器記憶體管理 (`URL.revokeObjectURL`)**：
   - 經對抗性測試進行 100 次連續音訊檔切換，系統精準呼叫 `URL.revokeObjectURL` 99 次。
   - 舊的 Blob URL 被即時釋放，沒有殘留記憶體洩漏漏洞。
2. **Windows 檔名相容性**：
   - 特殊字元 `測試(Live)#1.mp3`、`#`, `&`, `[`, `]` 及 Unicode Emoji 檔名在 `audioFileName` 設定中使用了 `textContent` 與 `setAttribute`，渲染效果極為安全且穩定。

---

## 獨立驗證方法 (Verification Method)

審查人員可以透過執行專案的對抗性自動化測試套件獨立重現上述結論：

```powershell
# 執行 Tier 5 對抗性與 DOM 安全自動化測試
agy-node -e "const suite = require('./tests/tier5_adversarial/m1_challenger_2_dom_security.test'); suite.run();"

# 執行 Central Test Runner
agy-node tests/runner.js
```

---

## 結論與建議 Verdict

** Verdict**: ❌ **REJECT (拒絕通過)**

SoundSync AI 前端在選檔記憶體管理與檔名相容性上表現優異，但其字幕時間軸渲染機制存在**嚴重 DOM-based XSS 安全漏洞**，無法承受惡意輸入或特殊歌詞符號對抗測試。請實作團隊（Worker）儘速將 `renderSubtitles` 調整為純文字 DOM 節點建立 (`textContent`) 並修正 `validateAudioFile` 空 MIME 檢查邏輯後重新提交審查。

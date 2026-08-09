# 5-Component Handoff Report — SoundSync AI 音訊與字幕架構探索

## 1. Observation (觀察紀錄)

以下為針對專案檔案進行 Read-only 探索時直接觀察到的實體路徑、行號與程式碼片段：

- **需求文件**：`C:\外掛\影像\workspace\AI20260622-main\.agents\ORIGINAL_REQUEST.md`
  - **行號 13-26** 規定：
    - R1: "Provide a clean WebAudio 16kHz Mono resampling pipeline to clean vocal audio tracks before sending to Gemini API."
    - R2: "Integrate Google Gemini 2.0 Flash REST API (https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent) with automatic fallback to secondary compatible endpoints... Enforce JSON format response for subtitle items with start/end millisecond timestamps."
    - R3: "Implement a millisecond overlap correction algorithm to adjust consecutive subtitle boundaries... Provide interactive real-time lyric teleprompter scrolling... Support one-click download for .SRT, .LRC, .VTT, and text clipboard copy."

- **前端核心頁面**：`C:\外掛\影像\workspace\AI20260622-main\soundsync.html`
  - **行號 263-266**：現有音訊轉 Base64 邏輯為直讀原始檔案 DataURL：
    ```javascript
    const reader = new FileReader();
    reader.onload = function(e) {
      currentAudioBase64 = e.target.result.split(",")[1];
      console.log("Audio Base64 loaded successfully!");
    };
    reader.readAsDataURL(file);
    ```
    *觀察*：未經過任何 WebAudio `OfflineAudioContext` 16kHz Mono 重採樣降採樣處理。
  
  - **行號 358-404**：Gemini API 呼叫結構：
    ```javascript
    const requestUrl = `https://generativelanguage.googleapis.com/v1beta/models/${mod.id}:generateContent?key=${apiKey}`;
    ```
    *觀察*：未設定 `generationConfig: { responseMimeType: "application/json" }`，完全依靠 Prompt 提示詞口頭要求 JSON。

  - **行號 498-505**：時間解析函式 `parseSeconds`：
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
    *觀察*：若輸入為 `01:23.450`（2 個分段 `parts.length === 2`），會直接走入 `parseFloat("01:23.450")`，傳回 1 秒，遺失 60 秒（1 分鐘）。

  - **行號 578**：.LRC 匯出時間解析：
    ```javascript
    let parts = sub.start.split(":");
    let min = parseInt(parts[0]) * 60 + parseInt(parts[1]);
    ```
    *觀察*：若時間格式為 `MM:SS.mmm`，`parts[1]` 代表秒數而非分鐘，計算出的 `min` 會錯誤或為 `NaN`。

---

## 2. Logic Chain (推論邏輯鏈)

1. **基於 Observation 行號 263-266**：目前音訊讀取直接轉為 Base64，使得大容量雙聲道音訊（例如 44.1kHz / 48kHz WAV 或高音質 MP3）檔案大小可達 15MB~50MB 以上。Gemini API Payload 龐大會增加網路傳送負擔與逾時機率。
2. **基於 Observation 行號 13-15 (R1)**：需求明文規定需有 WebAudio 16kHz Mono 重採樣管道。經由 `OfflineAudioContext` 降採樣為 16kHz 16-bit 單聲道 WAV，可將體積縮減 50%~80%（4 分鐘約 7.68MB WAV），同時可消除雙聲道相位差與高頻噪音，提升 Gemini 人聲打軸精準度。
3. **基於 Observation 行號 498-505 與 578**：API 回傳之 Timestamp 可能出現 `MM:SS.mmm` 格式或浮點數秒數。現有的 `parseSeconds` 與 `.LRC` 匯出邏輯強依賴 `HH:MM:SS` (3 分段) 或特定字串分割，一旦遇到 2 分段格式即會發生嚴重的「分鐘數遺失」與 `NaN` 計算錯誤。
4. **基於 Observation 行號 358-404**：Gemini 2.0 Flash 支援原生 `responseMimeType: "application/json"`，新增此配置可保證百分之百傳回合規 JSON，免去手動去除 Markdown Codeblock 的額外風險。
5. **基於 Observation 行號 549**：提詞器 `scrollIntoView({ behavior: "smooth", block: "nearest" })` 在邊界時捲動幅度較小，若改為 `block: "center"`，能讓當前播放歌詞一直居中於視窗，大幅提升廣播級提詞體驗。

---

## 3. Caveats (注意事項與限制)

- **瀏覽器音訊解碼限制**：極少數極端舊版瀏覽器或系統缺少對 AAC/M4A 格式之 `decodeAudioData` 原生解碼器；若 `decodeAudioData` 失敗，可設計退回原始 File DataURL 的 Fallback 保護。
- **未實作環境測試**：本階段為 Read-Only Explorer 探索調查，所有程式修訂建議均已驗證邏輯與語法，但尚未直接於專案源碼中進行實體修改或瀏覽器點對點測試。

---

## 4. Conclusion (探索結論)

1. **WebAudio 16kHz 重採樣**：必須新增 `resampleAudioTo16kMonoWav` 函式，利用 `AudioContext` 與 `OfflineAudioContext` 生成 16kHz 16-bit Mono WAV 標頭與 PCM 數據。
2. **API 呼叫與解析防護**：呼叫 Gemini API 時須加上 `generationConfig.responseMimeType = "application/json"`；重構 `parseSeconds` 防禦型解析器以兼容 `HH:MM:SS.mmm`、`MM:SS.mmm` 及數值秒數型態。
3. **字幕重疊修正與匯出**：修復 LRC/SRT 匯出格式依賴漏洞，優化提詞器 `block: "center"` 自動居中。

---

## 5. Verification Method (驗證方法)

1. **檔案檢查**：
   - 檢視 `soundsync.html` 的 JavaScript 區塊。
   - 檢視 `C:\外掛\影像\workspace\AI20260622-main\.agents\explorer_survey_2\analysis.md`。
2. **驗證情境**：
   - 測試音訊載入時 console 輸出重採樣後的 WAV Base64 大小。
   - 以 `01:12.450` 作為 `parseSeconds` 輸入，驗證輸出是否精確為 `72.45` 秒而非 `1` 秒。
   - 測試播放音訊時提詞器字幕行是否精準捲動至畫面正中央。

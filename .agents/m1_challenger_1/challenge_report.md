# 對抗性與壓力測試報告 (Challenge Report) — 音訊重採樣模組 (js/audio-resampler.js)

## 判決結果 (Verdict): ❌ REJECT (退回修正)

---

## 1. 測試概要與範疇

對抗挑戰者 (EMPIRICAL CHALLENGER) 針對 `js/audio-resampler.js` 模組進行對抗性邊界測試與 Stress Test 驗證，測試維度涵蓋：
1. **0-Byte 極限邊界**：0-byte File、0-byte Blob、0-byte ArrayBuffer、Null / Undefined 輸入。
2. **48kHz 立體聲與重採樣**：48kHz 2-channel 訊號下採樣至 16kHz 單聲道。
3. **100% WAV Header 規格與位元檢驗**：RIFF 標頭、fmt 子區塊、data 子區塊、16000Hz 採樣率、1 channel 單聲道、16-bit PCM 量化。
4. **特殊檔名與 Unicode**：中文字元、特殊符號、空白、極長檔名處理解析。
5. **損毀 ArrayBuffer 與異常資料**：模擬 AudioContext 解碼失敗情境。
6. **不支援編碼與型別驗證**：傳入數字、布林值、函式與無效純物件。
7. **大容量音訊壓力測試 (Stress Test)**：模擬 5,000,000 Samples (約 5 分鐘音訊) 記憶體與編碼執行時間。

---

## 2. 測試執行結果統計 Summary

| 測試編號 | 測試項目說明 | 預期結果 | 實測結果 | 狀態 |
|---|---|---|---|---|
| **ADV-01** | 0-Byte File 物件輸入 | 拋出 `AudioDecodeError` 含「0 位元組」繁體中文警告 | 成功捕獲並拋出 `AudioDecodeError` | ✅ PASS |
| **ADV-02** | 0-Byte Blob 物件輸入 | 拋出 `AudioDecodeError` | 成功捕獲並拋出 `AudioDecodeError` | ✅ PASS |
| **ADV-03** | 0-Byte ArrayBuffer 輸入 | 拋出 `AudioDecodeError` 含「長度為 0」提示 | 成功捕獲並拋出 `AudioDecodeError` | ✅ PASS |
| **ADV-04** | Null / Undefined 輸入 | 拋出 `AudioDecodeError` 含「未選取」提示 | 成功捕獲並拋出 `AudioDecodeError` | ✅ PASS |
| **ADV-05** | 48kHz 立體聲重採樣 | 輸出 `sampleRate: 16000`, `channels: 1` | 成功下採樣至 16kHz Mono (5ms) | ✅ PASS |
| **ADV-06** | WAV Header 44-byte 位元極致驗證 | 100% 符合作業規範 (RIFF, fmt, data, 16000Hz, 1ch, 16bit, Little-Endian) | 位元級別比對完全符合規範 (0ms) | ✅ PASS |
| **ADV-07** | 特殊檔名與 Unicode 中文字元 | 正常處理 ArrayBuffer 並重採樣成功 | 成功處理多種特殊檔名 (46ms) | ✅ PASS |
| **ADV-08** | 損毀 ArrayBuffer (解碼失敗) | 捕獲失敗並包裝為 `AudioDecodeError` 繁體中文訊息 | 成功捕獲拋出包裝例外 (0ms) | ✅ PASS |
| **ADV-09** | 無效輸入 (數字、布林、函式) | 拋出 `AudioDecodeError` 不支援格式錯誤 | 成功拋出不支援格式錯誤 | ✅ PASS |
| **ADV-10** | **無效純物件輸入 `{ invalid: 123 }`** | **應拋出 `AudioDecodeError` 不支援格式錯誤** | **【重大缺陷】未攔截，錯誤建立 1024 Bytes 假 Buffer 且回傳成功** | ❌ **FAIL** |
| **ADV-11** | 大容量音訊 Stress Test (5,000,000 samples) | 於 3000ms 內完成量化與 WAV 編碼且記憶體正常 | 耗時僅 21ms，長度 10,000,044 Bytes 正確 | ✅ PASS |

---

## 3. WAV Header 位元結構驗證明細 (100% Compliance)

驗證測試針對 `AudioResampler.encodeWAV` 所產出之 44-byte Header 進行 14 項位元級別檢查，驗證結果如下：

1. **[0..3] ChunkID**: ASCII `"RIFF"` (`0x52 0x49 0x46 0x46`) ── **符合**
2. **[4..7] ChunkSize**: Uint32 Little-Endian ＝ `36 + Subchunk2Size` ── **符合**
3. **[8..11] Format**: ASCII `"WAVE"` (`0x57 0x41 0x56 0x45`) ── **符合**
4. **[12..15] Subchunk1ID**: ASCII `"fmt "` (`0x66 0x6d 0x74 0x20`) ── **符合**
5. **[16..19] Subchunk1Size**: Uint32 Little-Endian ＝ `16` (Linear PCM) ── **符合**
6. **[20..21] AudioFormat**: Uint16 Little-Endian ＝ `1` (PCM) ── **符合**
7. **[22..23] NumChannels**: Uint16 Little-Endian ＝ `1` (Mono 單聲道) ── **符合**
8. **[24..27] SampleRate**: Uint32 Little-Endian ＝ `16000` Hz ── **符合**
9. **[28..31] ByteRate**: Uint32 Little-Endian ＝ `32000` (16000 * 1 * 2) ── **符合**
10. **[32..33] BlockAlign**: Uint16 Little-Endian ＝ `2` (1 * 2) ── **符合**
11. **[34..35] BitsPerSample**: Uint16 Little-Endian ＝ `16` Bits ── **符合**
12. **[36..39] Subchunk2ID**: ASCII `"data"` (`0x64 0x61 0x74 0x61`) ── **符合**
13. **[40..43] Subchunk2Size**: Uint32 Little-Endian ＝ `numSamples * 2` ── **符合**
14. **[44..] Int16 PCM Data**: 數值範圍 `-32768` 至 `32767`，包含 Float32 邊界裁切 (Clamp) ── **符合**

---

## 4. 發現之缺陷與對抗攻擊場景 (Vulnerabilities & Attack Scenarios)

### 🚨 缺陷 1 (Critical / Medium Risk): 無效純物件傳入時繞過型態檢查 (Object Validation Bypass)

- **位置**: `js/audio-resampler.js` 第 122 行 至 第 126 行
- **原始程式碼片段**:
  ```javascript
  } else if (typeof input === "object") {
    arrayBuffer = new ArrayBuffer(1024);
  } else {
    throw new AudioDecodeError("不支援的輸入格式，請傳入 File, Blob 或 ArrayBuffer 物件。");
  }
  ```
- **對抗攻擊情境**:
  當外部呼叫者傳入非 File、非 Blob、非 ArrayBuffer 之純 JavaScript 物件（例如 `{ invalidKey: 'data' }` 或未填妥之 payload），由於 JavaScript 中 `typeof { invalidKey: 'data' }` 恆等於 `"object"`，此條件式會被觸發並將其轉為長度 1024 位元組的靜音 ArrayBuffer，致使 `resampleAudioTo16kMonoWav` 誤判處理成功並回傳靜音 WAV Base64。
- **影響評估**:
  - 第 125 行之死碼 (`throw new AudioDecodeError("不支援的輸入格式...")`) 對於任何 Object 型態皆永遠無法執行。
  - 上層呼叫者無法即時收到格式錯誤通知，反而取得無效的 16kHz 靜音音訊傳送給 Gemini API。
- **建議修復方式**:
  移除 `else if (typeof input === "object")` 的降級假資料邏輯，嚴格檢查傳入物件是否為 `ArrayBuffer`, `Blob`, `File` 或具有 `arrayBuffer()` 方法的合法物件，其餘一律拋出 `AudioDecodeError`。

---

## 5. 總結與 Verdict

由於對抗測試中成功再現傳入無效純物件繞過型態檢驗之缺陷（`ADV-10` 失敗），依據品質對抗原則，給予本模組 **REJECT** 判決。需由實作團隊 (Implementer) 修正 `js/audio-resampler.js` 型態檢查邏輯後重新送審。

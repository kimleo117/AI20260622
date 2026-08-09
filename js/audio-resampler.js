/**
 * SoundSync AI - WebAudio 16kHz Mono Resampler Module
 * 原生 WebAudio 16kHz 16-bit Mono WAV 重採樣管道與 44-byte RIFF/WAV 編碼器
 */

/**
 * 自訂音訊解碼與重採樣例外處理類別
 */
class AudioDecodeError extends Error {
  constructor(message, originalError = null) {
    super(message);
    this.name = "AudioDecodeError";
    this.originalError = originalError;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AudioDecodeError);
    }
  }
}

/**
 * 音訊重採樣器主要類別
 */
class AudioResampler {
  /**
   * 將音訊檔案 (File/Blob/ArrayBuffer) 重採樣為 16kHz 單聲道 16-bit PCM WAV
   * @param {File|Blob|ArrayBuffer} input 輸入音訊檔案或數據
   * @returns {Promise<{wavBase64: string, sampleRate: number, channels: number, duration: number, audioBuffer: AudioBuffer, blob: Blob}>}
   */
  static async resample(input) {
    return resampleAudioTo16kMonoWav(input);
  }

  /**
   * 將 AudioBuffer 編碼為包含 44-byte RIFF 標頭的 16-bit PCM WAV 格式 Uint8Array
   * @param {AudioBuffer} audioBuffer WebAudio API 產出的 AudioBuffer 實例
   * @returns {Uint8Array} WAV 格式位元組陣列
   */
  static encodeWAV(audioBuffer) {
    if (!audioBuffer || typeof audioBuffer.getChannelData !== "function") {
      throw new AudioDecodeError("無效的 AudioBuffer 物件，無法進行 WAV 編碼。");
    }

    const numChannels = 1; // 恆定為 1 (Mono)
    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0);
    const numSamples = channelData.length;
    const bytesPerSample = 2; // 16-bit PCM (2 bytes)
    const pcmByteLength = numSamples * bytesPerSample;
    const totalByteLength = 44 + pcmByteLength;

    const buffer = new ArrayBuffer(totalByteLength);
    const view = new DataView(buffer);

    // 輔助寫入 ASCII 字串函數
    const writeString = (offset, str) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    /* RIFF 標頭 (12 bytes) */
    writeString(0, "RIFF");
    view.setUint32(4, 36 + pcmByteLength, true); // ChunkSize (檔案總位元組數 - 8)
    writeString(8, "WAVE");

    /* fmt 子區塊 (24 bytes) */
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);           // Subchunk1Size (16 代表 PCM 格式)
    view.setUint16(20, 1, true);            // AudioFormat (1 = Linear PCM)
    view.setUint16(22, numChannels, true);   // NumChannels (1 = Mono)
    view.setUint32(24, sampleRate, true);    // SampleRate (16000 Hz)
    view.setUint32(28, sampleRate * numChannels * bytesPerSample, true); // ByteRate (32000)
    view.setUint16(32, numChannels * bytesPerSample, true);              // BlockAlign (2)
    view.setUint16(34, 16, true);           // BitsPerSample (16 bits)

    /* data 子區塊 (8 bytes + PCM 資料) */
    writeString(36, "data");
    view.setUint32(40, pcmByteLength, true); // Subchunk2Size

    /* Float32 至 Int16 PCM 量化與寫入 */
    let offset = 44;
    for (let i = 0; i < numSamples; i++, offset += 2) {
      // 數值裁切 (Clamp) 防溢位
      let s = Math.max(-1, Math.min(1, channelData[i]));
      // Float32 to Int16 Little-Endian
      let val = s < 0 ? s * 0x8000 : s * 0x7FFF;
      view.setInt16(offset, val, true);
    }

    return new Uint8Array(buffer);
  }
}

/**
 * 導出之單一非同步介面：將傳入音訊檔重採樣至 16kHz 單聲道 WAV
 * @param {File|Blob|ArrayBuffer} input 
 * @returns {Promise<{wavBase64: string, sampleRate: number, channels: number, duration: number, audioBuffer: AudioBuffer, blob: Blob}>}
 */
async function resampleAudioTo16kMonoWav(input) {
  if (!input) {
    throw new AudioDecodeError("未選取或傳入有效的音訊檔案數據。");
  }

  // 0 Byte 檔案檢查
  if (typeof Blob !== "undefined" && input instanceof Blob && input.size === 0) {
    throw new AudioDecodeError("傳入的音訊檔案容量為 0 位元組 (0 Bytes)，檔案已損毀或內容為空白。");
  }

  // 取得 ArrayBuffer
  let arrayBuffer;
  try {
    if (input instanceof ArrayBuffer) {
      arrayBuffer = input.slice(0);
    } else if (typeof Blob !== "undefined" && input instanceof Blob) {
      arrayBuffer = await input.arrayBuffer();
    } else if (input && input.buffer instanceof ArrayBuffer) {
      arrayBuffer = input.buffer.slice(0);
    } else {
      throw new AudioDecodeError("不支援的輸入格式，請傳入 File, Blob 或 ArrayBuffer 物件。");
    }
  } catch (err) {
    if (err instanceof AudioDecodeError) throw err;
    throw new AudioDecodeError("讀取音訊數據 ArrayBuffer 時發生錯誤：" + err.message, err);
  }

  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    throw new AudioDecodeError("音訊 ArrayBuffer 資料長度為 0，無法進行解碼。");
  }

  // 檢查當前執行環境 WebAudio API 支援度
  const AudioCtx = typeof window !== "undefined" ? (window.AudioContext || window.webkitAudioContext) : null;
  const OfflineAudioCtx = typeof window !== "undefined" ? (window.OfflineAudioContext || window.webkitOfflineAudioContext) : null;

  if (!AudioCtx || !OfflineAudioCtx) {
    throw new AudioDecodeError("您的環境不支援原生 WebAudio API (AudioContext / OfflineAudioContext)。");
  }

  // 步驟 1: 使用解碼用 AudioContext 進行 AudioBuffer 解碼
  const tempCtx = new AudioCtx();
  let decodedBuffer;

  try {
    const bufferCopy = arrayBuffer.slice(0);
    decodedBuffer = await new Promise((resolve, reject) => {
      let res;
      try {
        res = tempCtx.decodeAudioData(
          bufferCopy,
          (buf) => resolve(buf),
          (err) => reject(err || new Error("WebAudio decodeAudioData 解碼失敗"))
        );
      } catch (e) {
        return reject(e);
      }
      if (res && typeof res.then === "function") {
        res.then(resolve).catch(reject);
      }
    });
  } catch (err) {
    throw new AudioDecodeError("音訊檔案解碼失敗，檔案可能已損毀、受保護或格式不支援。", err);
  } finally {
    if (tempCtx.close && typeof tempCtx.close === "function") {
      try { await tempCtx.close(); } catch (e) { /* ignore */ }
    }
  }

  // 步驟 2: 建立 OfflineAudioContext 下採樣至 16kHz 單聲道
  const targetSampleRate = 16000;
  const targetChannels = 1;
  const totalFrames = Math.ceil((decodedBuffer.duration || 0) * targetSampleRate);

  const offlineCtx = new OfflineAudioCtx(targetChannels, Math.max(1, totalFrames), targetSampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = decodedBuffer;
  // 自動 Downmix 合併至單聲道
  source.connect(offlineCtx.destination);
  source.start(0);

  let renderedBuffer;
  try {
    renderedBuffer = await offlineCtx.startRendering();
  } catch (err) {
    throw new AudioDecodeError("WebAudio 下採樣渲染處理失敗：" + err.message, err);
  }

  // 步驟 3: PCM 量化與 WAV 44-byte 表頭編碼
  const uint8Wav = AudioResampler.encodeWAV(renderedBuffer);
  const blob = new Blob([uint8Wav], { type: "audio/wav" });

  // 步驟 4: 轉換為 Base64 字串
  const wavBase64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result && typeof reader.result === "string") {
        const parts = reader.result.split(",");
        resolve(parts[1] || parts[0]);
      } else {
        reject(new AudioDecodeError("轉換 Base64 時無法讀取結果。"));
      }
    };
    reader.onerror = (e) => reject(new AudioDecodeError("FileReader 讀取 Blob 失敗。", e));
    reader.readAsDataURL(blob);
  });

  return {
    wavBase64,
    sampleRate: targetSampleRate,
    channels: targetChannels,
    duration: renderedBuffer.duration,
    audioBuffer: renderedBuffer,
    blob
  };
}

// 匯出機制 (CommonJS & Browser Global)
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    AudioDecodeError,
    AudioResampler,
    resampleAudioTo16kMonoWav
  };
}

if (typeof window !== "undefined") {
  window.AudioDecodeError = AudioDecodeError;
  window.AudioResampler = AudioResampler;
  window.resampleAudioTo16kMonoWav = resampleAudioTo16kMonoWav;
}

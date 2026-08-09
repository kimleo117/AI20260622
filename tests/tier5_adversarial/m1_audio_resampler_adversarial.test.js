/**
 * SoundSync AI - Tier 5 Adversarial & Stress Test Suite for Audio Resampler (M1)
 * 驗證對抗性邊界條件、48kHz立體聲、大容量音訊壓力、損毀資料、不支援編碼與 44-byte WAV Header 位元結構
 */

const { TestSuite, assert } = require('../helpers/test_framework');
const { AudioDecodeError, AudioResampler, resampleAudioTo16kMonoWav } = require('../../js/audio-resampler');

const suite = new TestSuite('Tier 5 Adversarial & Stress Test: Audio Resampler (M1)');

// 模擬 WebAudio 與 Web API (Node.js 執行環境)
class MockAudioBuffer {
  constructor({ length = 48000, numberOfChannels = 2, sampleRate = 48000, data = null } = {}) {
    this.length = length;
    this.numberOfChannels = numberOfChannels;
    this.sampleRate = sampleRate;
    this.duration = length / sampleRate;
    this._channelData = [];

    for (let c = 0; c < numberOfChannels; c++) {
      if (data && data[c]) {
        this._channelData.push(data[c]);
      } else {
        const chan = new Float32Array(length);
        if (data && data[0]) {
          chan.set(data[0]);
        }
        this._channelData.push(chan);
      }
    }
  }

  getChannelData(c) {
    return this._channelData[c] || this._channelData[0];
  }
}

class MockAudioContext {
  async decodeAudioData(buf, resolve, reject) {
    if (!buf || buf.byteLength === 0) {
      const err = new Error('Invalid ArrayBuffer length');
      if (reject) reject(err);
      throw err;
    }

    // 模擬損毀 ArrayBuffer 觸發失敗 (特定長度 1337 或魔術位元組 0xDEADBEEF)
    const view = new DataView(buf);
    if (buf.byteLength === 1337 || (buf.byteLength >= 4 && view.getUint32(0) === 0xDEADBEEF)) {
      const err = new Error('WebAudio decodeAudioData 格式解碼失敗：音訊標頭損毀');
      if (reject) reject(err);
      throw err;
    }

    // 判斷是否為 48kHz 模擬標頭
    let sampleRate = 44100;
    let numberOfChannels = 2;
    let length = 48000;

    if (buf.byteLength >= 8 && view.getUint32(0) === 0x30303030) {
      sampleRate = view.getUint32(4) || 48000;
    } else if (buf.byteLength === 96000) {
      sampleRate = 48000;
      numberOfChannels = 2;
      length = 48000;
    }

    const audioBuf = new MockAudioBuffer({ length, numberOfChannels, sampleRate });
    if (resolve) resolve(audioBuf);
    return audioBuf;
  }

  async close() {}
}

class MockOfflineAudioContext {
  constructor(channels, length, sampleRate) {
    this.channels = channels;
    this.length = length;
    this.sampleRate = sampleRate;
    this.renderedBuffer = new MockAudioBuffer({
      length: Math.max(1, length),
      numberOfChannels: channels,
      sampleRate: sampleRate
    });
  }

  createBufferSource() {
    return {
      buffer: null,
      connect: () => {},
      start: () => {}
    };
  }

  get destination() { return {}; }

  async startRendering() {
    return this.renderedBuffer;
  }
}

class MockFileReader {
  readAsDataURL(blob) {
    setTimeout(() => {
      this.result = 'data:audio/wav;base64,UklGRmQAAABXQVZFZm10EBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
      if (this.onloadend) this.onloadend();
    }, 0);
  }
}

global.AudioContext = MockAudioContext;
global.webkitAudioContext = MockAudioContext;
global.OfflineAudioContext = MockOfflineAudioContext;
global.webkitOfflineAudioContext = MockOfflineAudioContext;
global.FileReader = MockFileReader;
if (typeof global.Blob === 'undefined') {
  global.Blob = class Blob {
    constructor(parts, options) {
      this.parts = parts;
      this.type = options ? options.type : '';
      let len = 0;
      parts.forEach(p => {
        if (p instanceof Uint8Array || p instanceof ArrayBuffer) len += p.byteLength || p.length;
        else if (typeof p === 'string') len += p.length;
      });
      this.size = len;
    }
    async arrayBuffer() {
      return new ArrayBuffer(this.size);
    }
  };
}
global.window = global;

// ----------------------------------------------------------------------------
// 測試案例區段 1：0-byte 音訊與極限邊界測試 (Boundary Tests)
// ----------------------------------------------------------------------------

suite.it('ADV-01 [0-Byte File]: 傳入容量為 0 Bytes 之 File 物件應拋出 AudioDecodeError 且含繁體中文警告', async () => {
  const emptyFile = { name: 'empty_test.mp3', size: 0, type: 'audio/mp3' };
  try {
    await resampleAudioTo16kMonoWav(emptyFile);
    assert.fail('0-byte File 未拋出 AudioDecodeError 例外');
  } catch (err) {
    assert.ok(err instanceof AudioDecodeError, '錯誤型別應為 AudioDecodeError');
    assert.ok(err.message.includes('0 位元組') || err.message.includes('0 Bytes'), '錯誤訊息應包含 0 位元組提示');
  }
});

suite.it('ADV-02 [0-Byte Blob]: 傳入容量為 0 Bytes 之 Blob 物件應拋出 AudioDecodeError', async () => {
  const emptyBlob = new global.Blob([], { type: 'audio/wav' });
  emptyBlob.size = 0;
  try {
    await resampleAudioTo16kMonoWav(emptyBlob);
    assert.fail('0-byte Blob 未拋出 AudioDecodeError 例外');
  } catch (err) {
    assert.ok(err instanceof AudioDecodeError, '錯誤型別應為 AudioDecodeError');
  }
});

suite.it('ADV-03 [0-Byte ArrayBuffer]: 傳入 length 為 0 之 ArrayBuffer 應被攔截並拋出例外', async () => {
  const emptyBuffer = new ArrayBuffer(0);
  try {
    await resampleAudioTo16kMonoWav(emptyBuffer);
    assert.fail('0-byte ArrayBuffer 未拋出 AudioDecodeError 例外');
  } catch (err) {
    assert.ok(err instanceof AudioDecodeError, '錯誤型別應為 AudioDecodeError');
    assert.ok(err.message.includes('長度為 0'), '錯誤訊息應提及長度為 0');
  }
});

suite.it('ADV-04 [Null/Undefined Input]: 傳入 null 或 undefined 時應精準拋出非空提示錯誤', async () => {
  try {
    await resampleAudioTo16kMonoWav(null);
    assert.fail('null 輸入未拋出例外');
  } catch (err) {
    assert.ok(err instanceof AudioDecodeError);
    assert.ok(err.message.includes('未選取'));
  }
});

// ----------------------------------------------------------------------------
// 測試案例區段 2：48kHz 立體聲 Downsampling 與 WAV Header 結構驗證
// ----------------------------------------------------------------------------

suite.it('ADV-05 [48kHz Stereo Downsampling]: 48kHz 立體聲訊號下採樣至 16kHz 單聲道', async () => {
  const stereoBuffer = new ArrayBuffer(96000);
  const result = await AudioResampler.resample(stereoBuffer);

  assert.strictEqual(result.sampleRate, 16000, '採樣率必須重採樣至 16000Hz');
  assert.strictEqual(result.channels, 1, '聲道數必須轉為 1 (Mono)');
  assert.ok(result.audioBuffer, '必須回傳重採樣後的 AudioBuffer');
  assert.strictEqual(result.audioBuffer.sampleRate, 16000, 'AudioBuffer 採樣率應為 16000');
});

suite.it('ADV-06 [WAV Header 100% 規格檢驗]: 嚴格檢查 44-byte RIFF/fmt/data 結構位元', () => {
  const sampleCount = 1600; // 0.1 秒 PCM 音訊
  const mockBuf = new MockAudioBuffer({ length: sampleCount, numberOfChannels: 1, sampleRate: 16000 });
  
  const chanData = mockBuf.getChannelData(0);
  chanData[0] = 0.0;
  chanData[1] = 1.0;
  chanData[2] = -1.0;
  chanData[3] = 0.5;
  chanData[4] = 2.5;  // 應被裁切為 1.0 (32767)
  chanData[5] = -3.0; // 應被裁切為 -1.0 (-32768)

  const wavBytes = AudioResampler.encodeWAV(mockBuf);
  assert.ok(wavBytes instanceof Uint8Array, '回傳必須為 Uint8Array');

  const expectedPcmBytes = sampleCount * 2;
  const expectedTotalBytes = 44 + expectedPcmBytes;
  assert.strictEqual(wavBytes.length, expectedTotalBytes, `總檔案大小應為 44 + ${expectedPcmBytes} = ${expectedTotalBytes}`);

  const view = new DataView(wavBytes.buffer);

  // 1. RIFF Chunk Identifier (Bytes 0..3)
  const riffText = String.fromCharCode(wavBytes[0], wavBytes[1], wavBytes[2], wavBytes[3]);
  assert.strictEqual(riffText, 'RIFF', 'Header [0..3] 必須為 ASCII "RIFF"');

  // 2. ChunkSize (Bytes 4..7) = TotalBytes - 8 = 36 + Subchunk2Size
  const chunkSize = view.getUint32(4, true);
  assert.strictEqual(chunkSize, 36 + expectedPcmBytes, 'ChunkSize 必須等於 36 + pcmByteLength');

  // 3. Format (Bytes 8..11)
  const waveText = String.fromCharCode(wavBytes[8], wavBytes[9], wavBytes[10], wavBytes[11]);
  assert.strictEqual(waveText, 'WAVE', 'Header [8..11] 必須為 ASCII "WAVE"');

  // 4. Subchunk1ID (Bytes 12..15)
  const fmtText = String.fromCharCode(wavBytes[12], wavBytes[13], wavBytes[14], wavBytes[15]);
  assert.strictEqual(fmtText, 'fmt ', 'Header [12..15] 必須為 ASCII "fmt "');

  // 5. Subchunk1Size (Bytes 16..19) -> 16 for PCM
  const subchunk1Size = view.getUint32(16, true);
  assert.strictEqual(subchunk1Size, 16, 'Subchunk1Size 必須為 16 (PCM)');

  // 6. AudioFormat (Bytes 20..21) -> 1 for Uncompressed Linear PCM
  const audioFormat = view.getUint16(20, true);
  assert.strictEqual(audioFormat, 1, 'AudioFormat 必須為 1 (Linear PCM)');

  // 7. NumChannels (Bytes 22..23) -> 1 (Mono)
  const numChannels = view.getUint16(22, true);
  assert.strictEqual(numChannels, 1, 'NumChannels 必須為 1 (Mono)');

  // 8. SampleRate (Bytes 24..27) -> 16000
  const sampleRate = view.getUint32(24, true);
  assert.strictEqual(sampleRate, 16000, 'SampleRate 必須為 16000 Hz');

  // 9. ByteRate (Bytes 28..31) -> SampleRate * NumChannels * BitsPerSample / 8 = 16000 * 1 * 2 = 32000
  const byteRate = view.getUint32(28, true);
  assert.strictEqual(byteRate, 32000, 'ByteRate 必須為 32000');

  // 10. BlockAlign (Bytes 32..33) -> NumChannels * BitsPerSample / 8 = 2
  const blockAlign = view.getUint16(32, true);
  assert.strictEqual(blockAlign, 2, 'BlockAlign 必須為 2');

  // 11. BitsPerSample (Bytes 34..35) -> 16
  const bitsPerSample = view.getUint16(34, true);
  assert.strictEqual(bitsPerSample, 16, 'BitsPerSample 必須為 16');

  // 12. Subchunk2ID (Bytes 36..39)
  const dataText = String.fromCharCode(wavBytes[36], wavBytes[37], wavBytes[38], wavBytes[39]);
  assert.strictEqual(dataText, 'data', 'Header [36..39] 必須為 ASCII "data"');

  // 13. Subchunk2Size (Bytes 40..43) -> pcmByteLength
  const subchunk2Size = view.getUint32(40, true);
  assert.strictEqual(subchunk2Size, expectedPcmBytes, 'Subchunk2Size 必須等於 pcmByteLength');

  // 14. 採樣值 Int16 量化與裁切 (Clamp) 檢查
  const sample0 = view.getInt16(44, true);
  const sample1 = view.getInt16(46, true);
  const sample2 = view.getInt16(48, true);
  const sample3 = view.getInt16(50, true);
  const sample4 = view.getInt16(52, true);
  const sample5 = view.getInt16(54, true);

  assert.strictEqual(sample0, 0, 'Float 0.0 應映射為 Int16 0');
  assert.strictEqual(sample1, 32767, 'Float 1.0 應映射為 Int16 32767 (0x7FFF)');
  assert.strictEqual(sample2, -32768, 'Float -1.0 應映射為 Int16 -32768 (-0x8000)');
  assert.strictEqual(sample3, 16383, 'Float 0.5 應映射為 Int16 16383');
  assert.strictEqual(sample4, 32767, '超出範圍的 Float 2.5 應被裁切 (Clamp) 為 32767');
  assert.strictEqual(sample5, -32768, '超出範圍的 Float -3.0 應被裁切 (Clamp) 為 -32768');
});

// ----------------------------------------------------------------------------
// 測試案例區段 3：特殊檔名與中文字元處理測試
// ----------------------------------------------------------------------------

suite.it('ADV-07 [特殊檔名與 Unicode]: 含有中文、空白、特殊符號與極長檔名之 File 處理測試', async () => {
  const specialNames = [
    '聲音檔_#1! (測試&最新) 2026 🎵.mp3',
    'spaces in filename (v1.0.2).wav',
    'special_chars!@#$%^&()_+-={}[];\',.flac',
    'a'.repeat(200) + '.m4a'
  ];

  for (const name of specialNames) {
    const mockFile = {
      name,
      size: 4096,
      type: 'audio/mp3',
      arrayBuffer: async () => new ArrayBuffer(4096)
    };

    const res = await AudioResampler.resample(mockFile);
    assert.strictEqual(res.sampleRate, 16000, `特殊檔名 [${name.substring(0, 20)}...] 重採樣應成功`);
  }
});

// ----------------------------------------------------------------------------
// 測試案例區段 4：損毀 ArrayBuffer 與不支援編碼測試
// ----------------------------------------------------------------------------

suite.it('ADV-08 [損毀 ArrayBuffer]: 傳入解碼失敗之 ArrayBuffer 應捕獲並包裝為 AudioDecodeError', async () => {
  const corruptedBuffer = new ArrayBuffer(1337); // 觸發 Mock 拋出解碼錯誤
  try {
    await AudioResampler.resample(corruptedBuffer);
    assert.fail('損毀 ArrayBuffer 未拋出例外');
  } catch (err) {
    assert.ok(err instanceof AudioDecodeError, '必須拋出 AudioDecodeError 例外');
    assert.ok(err.message.includes('音訊檔案解碼失敗') || err.message.includes('損毀'), '錯誤訊息應說明解碼失敗');
  }
});

suite.it('ADV-09 [不支援之輸入型別 - 基本純值]: 傳入數字、布林值、函式應拋出不支援格式錯誤', async () => {
  const invalidPrimitives = [12345, true, false, () => {}];

  for (const input of invalidPrimitives) {
    try {
      await AudioResampler.resample(input);
      assert.fail(`無效輸入 ${typeof input} 未拋出例外`);
    } catch (err) {
      assert.ok(err instanceof AudioDecodeError, `輸入 ${typeof input} 應拋出 AudioDecodeError`);
      assert.ok(err.message.includes('不支援的輸入格式') || err.message.includes('未選取'));
    }
  }
});

suite.it('ADV-10 [不支援之輸入型別 - 無效純物件缺陷驗證]: 傳入非 File/Blob/ArrayBuffer 之純物件 { invalid: 123 } 應拋出不支援格式錯誤', async () => {
  const plainObjectInput = { invalidKey: 'unsupported_object_payload' };
  try {
    await AudioResampler.resample(plainObjectInput);
    // 若代碼內部包含 else if (typeof input === "object") { arrayBuffer = new ArrayBuffer(1024); } 缺陷，會偷跑成功
    assert.fail('【發現缺陷】傳入非音訊之純物件 { invalidKey: ... } 未經檢驗即被錯誤處理為 1024 位元組 ArrayBuffer 並回傳成功！');
  } catch (err) {
    assert.ok(err instanceof AudioDecodeError, '傳入純物件應拋出 AudioDecodeError');
    assert.ok(err.message.includes('不支援的輸入格式'), '錯誤訊息應明確指出不支援該輸入格式');
  }
});

// ----------------------------------------------------------------------------
// 測試案例區段 5：大容量音訊 Stress Test 與記憶體/效能測試
// ----------------------------------------------------------------------------

suite.it('ADV-11 [Stress Test 大容量音訊]: 模擬 5,000,000 Samples (約 5 分鐘音訊) 之 WAV 編碼與記憶體壓力', () => {
  const largeSampleCount = 5000000;
  const largeBuf = new MockAudioBuffer({ length: largeSampleCount, numberOfChannels: 1, sampleRate: 16000 });

  const startTime = Date.now();
  const wavBytes = AudioResampler.encodeWAV(largeBuf);
  const durationMs = Date.now() - startTime;

  assert.strictEqual(wavBytes.length, 44 + largeSampleCount * 2, '大容量音訊編碼總長度應精準吻合');
  assert.ok(durationMs < 3000, `500 萬 Sample 量化與編碼耗時應小於 3 秒 (實際耗時: ${durationMs}ms)`);
});

if (require.main === module) {
  suite.run();
}

module.exports = suite;

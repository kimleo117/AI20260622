/**
 * SoundSync AI - Audio Resampler Unit Tests (Milestone 1)
 */

const { TestSuite, assert } = require('./helpers/test_framework');
const { AudioDecodeError, AudioResampler, resampleAudioTo16kMonoWav } = require('../js/audio-resampler');

const suite = new TestSuite('Milestone 1: WebAudio 16kHz Mono Resampler Unit Tests');

// Mock WebAudio and Web API for Node Environment testing
class MockAudioBuffer {
  constructor({ length = 48000, numberOfChannels = 2, sampleRate = 44100 } = {}) {
    this.length = length;
    this.numberOfChannels = numberOfChannels;
    this.sampleRate = sampleRate;
    this.duration = length / sampleRate;
    this._channelData = [new Float32Array(length), new Float32Array(length)];
  }
  getChannelData(c) {
    return this._channelData[c] || this._channelData[0];
  }
}

class MockAudioContext {
  async decodeAudioData(buf, resolve, reject) {
    const audioBuf = new MockAudioBuffer();
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
    this.renderedBuffer = new MockAudioBuffer({ length, numberOfChannels: channels, sampleRate });
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
global.window = global;

suite.it('AR-01: AudioDecodeError creates valid Error instance with Traditional Chinese message', () => {
  const err = new AudioDecodeError('音訊檔案解析失敗');
  assert.strictEqual(err.name, 'AudioDecodeError');
  assert.strictEqual(err.message, '音訊檔案解析失敗');
  assert.ok(err instanceof Error);
});

suite.it('AR-02: encodeWAV encodes AudioBuffer into 44-byte RIFF/WAVE header and 16-bit Int16 PCM data', () => {
  const buf = new MockAudioBuffer({ length: 16000, numberOfChannels: 1, sampleRate: 16000 });
  const uint8 = AudioResampler.encodeWAV(buf);
  
  assert.ok(uint8 instanceof Uint8Array);
  assert.strictEqual(uint8.length, 44 + 16000 * 2);

  const headerStr = String.fromCharCode(...uint8.slice(0, 4));
  assert.strictEqual(headerStr, 'RIFF');

  const waveStr = String.fromCharCode(...uint8.slice(8, 12));
  assert.strictEqual(waveStr, 'WAVE');

  const view = new DataView(uint8.buffer);
  const sampleRate = view.getUint32(24, true);
  assert.strictEqual(sampleRate, 16000);

  const channels = view.getUint16(22, true);
  assert.strictEqual(channels, 1);

  const bitsPerSample = view.getUint16(34, true);
  assert.strictEqual(bitsPerSample, 16);
});

suite.it('AR-03: resampleAudioTo16kMonoWav rejects null or undefined input', async () => {
  try {
    await resampleAudioTo16kMonoWav(null);
    assert.fail('Should have thrown AudioDecodeError');
  } catch (err) {
    assert.ok(err instanceof AudioDecodeError);
    assert.ok(err.message.includes('未選取'));
  }
});

suite.it('AR-04: resampleAudioTo16kMonoWav rejects 0-byte file input with 0 Bytes warning', async () => {
  try {
    await resampleAudioTo16kMonoWav({ size: 0, name: 'empty.mp3' });
    assert.fail('Should have thrown AudioDecodeError for 0-byte file');
  } catch (err) {
    assert.ok(err instanceof AudioDecodeError);
    assert.ok(err.message.includes('0 位元組'));
  }
});

suite.it('AR-05: AudioResampler.resample successfully downsamples audio to 16kHz Mono WAV', async () => {
  const arrayBuffer = new ArrayBuffer(2048);
  const result = await AudioResampler.resample(arrayBuffer);

  assert.strictEqual(result.sampleRate, 16000);
  assert.strictEqual(result.channels, 1);
  assert.ok(typeof result.wavBase64 === 'string');
  assert.ok(result.wavBase64.length > 0);
  assert.ok(result.duration > 0);
});

if (require.main === module) {
  suite.run();
}

module.exports = suite;

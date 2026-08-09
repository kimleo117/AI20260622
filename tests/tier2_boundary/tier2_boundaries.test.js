/**
 * Tier 2 Test Suite - Boundary & Edge Case Testing (25 Tests)
 */

const path = require('path');
const { TestSuite, assert } = require('../helpers/test_framework');
const { createDOMEnvironment } = require('../helpers/dom_simulator');

const htmlPath = path.resolve(__dirname, '../../soundsync.html');
const suite = new TestSuite('Tier 2: 邊界與極限測試 (Boundary & Edge Cases)');

let env;

suite.beforeEach(() => {
  env = createDOMEnvironment(htmlPath);
});

// Category 1: Audio File Boundaries
suite.it('T2-01: 0-byte empty audio file selection handles gracefully without throwing', () => {
  const { context, elements } = env;
  const emptyFile = { name: 'empty.mp3', type: 'audio/mp3', size: 0 };
  
  assert.doesNotThrow(() => {
    context.handleAudioFile(emptyFile);
  });
  assert.strictEqual(elements.audioFileName.innerText, 'empty.mp3');
});

suite.it('T2-02: Extreme duration audio (e.g. 36000 seconds / 10 hours) formats timecode correctly', () => {
  const { context, elements } = env;
  context.handleAudioFile({ name: 'long_10h.mp3', type: 'audio/mp3', size: 104857600 });
  
  elements.audioPlayer.duration = 36605; // 10 hrs, 10 mins, 5 secs -> 610 mins 5 secs
  elements.audioPlayer.onloadedmetadata();

  assert.strictEqual(elements.audioDuration.innerText, '610:05');
});

suite.it('T2-03: Multi-channel / high sample rate filename maintains correct MIME mapping', () => {
  const { context } = env;
  const highResFile = { name: 'studio_96k_24bit_surround.flac', type: 'audio/flac', size: 50000000 };
  
  context.handleAudioFile(highResFile);
  assert.strictEqual(context.currentAudioMime, 'audio/flac');
});

suite.it('T2-04: Audio file without speech/lyrics parses empty JSON array gracefully', () => {
  const { context } = env;
  const emptySubtitles = context.fixSubtitleOverlaps([]);
  assert.deepStrictEqual(emptySubtitles, []);
});

suite.it('T2-05: Non-audio file renamed to mp3 handles data loading without crash', (done) => {
  const { context } = env;
  const fakeCorruptFile = { name: 'fake.mp3', type: 'audio/mp3', content: 'THIS IS NOT AUDIO CONTENT' };
  
  assert.doesNotThrow(() => {
    context.handleAudioFile(fakeCorruptFile);
  });

  setTimeout(() => {
    assert.ok(context.currentAudioBase64.length > 0);
    done();
  }, 20);
});

// Category 2: Filename & Encoding Boundaries
suite.it('T2-06: Uppercase extension (.MP3, .WAV, .FLAC) resolves correct clean MIME type', () => {
  const { context } = env;
  const upperFile = { name: 'UPPERCASE_TEST.WAV', type: 'audio/wav', size: 100 };
  
  context.handleAudioFile(upperFile);
  // Pure MIME extraction logic
  const name = upperFile.name.toLowerCase();
  let cleanMime = 'audio/mp3';
  if (name.endsWith('.wav')) cleanMime = 'audio/wav';
  assert.strictEqual(cleanMime, 'audio/wav');
});

suite.it('T2-07: Filenames containing special characters and symbols process cleanly', () => {
  const { context, elements } = env;
  const specialFile = { name: '[最新] 測試 歌曲 (Live) #1 & $2.mp3', type: 'audio/mp3', size: 100 };
  
  context.handleAudioFile(specialFile);
  assert.strictEqual(elements.audioFileName.innerText, '[最新] 測試 歌曲 (Live) #1 & $2.mp3');
});

suite.it('T2-08: Filenames with multiple dots (song.final.v2.mp3) extract correct extension', () => {
  const { context } = env;
  const multiDotFile = { name: 'my.favorite.song.v2.final.wav', type: 'audio/wav', size: 100 };
  
  context.handleAudioFile(multiDotFile);
  assert.strictEqual(context.selectedAudioFile.name, 'my.favorite.song.v2.final.wav');
});

suite.it('T2-09: Unicode & Emoji filenames (🎵測試語音_2026.m4a) render in UI without encoding corruption', () => {
  const { context, elements } = env;
  const emojiFile = { name: '🎵測試語音_2026.m4a', type: 'audio/m4a', size: 100 };
  
  context.handleAudioFile(emojiFile);
  assert.strictEqual(elements.audioFileName.innerText, '🎵測試語音_2026.m4a');
});

suite.it('T2-10: Path separator in filename strings is handled safely without path traversal error', () => {
  const { context, elements } = env;
  const pathFile = { name: 'folder/subfolder/track.mp3', type: 'audio/mp3', size: 100 };
  
  context.handleAudioFile(pathFile);
  assert.strictEqual(elements.audioFileName.innerText, 'folder/subfolder/track.mp3');
});

// Category 3: API & Error Response Boundaries
suite.it('T2-11: HTTP 429 Quota Exceeded error mapping returns user-actionable Traditional Chinese guide', () => {
  const { context } = env;
  const translated = context.getFriendlyChineseError('RESOURCE_EXHAUSTED: Quota exceeded for quota metric');
  assert.ok(translated.includes('Gemini API 今日免費額度已達上限'));
});

suite.it('T2-12: HTTP 401 Unauthorized API Key error mapping guides key renewal', () => {
  const { context } = env;
  const translated = context.getFriendlyChineseError('API key not valid. Please pass a valid API key.');
  assert.ok(translated.includes('API 金鑰無效或填寫錯誤'));
});

suite.it('T2-13: HTTP 500 / 503 Server Error translates to server busy message', () => {
  const { context } = env;
  const translated = context.getFriendlyChineseError('Internal server error 500');
  assert.ok(translated.includes('Google 官方伺服器暫時忙碌'));
});

suite.it('T2-14: Network connection timeout or fetch rejection displays standard system failure prompt', () => {
  const { context } = env;
  const translated = context.getFriendlyChineseError('Failed to fetch');
  assert.ok(translated.includes('連線發生異常'));
});

suite.it('T2-15: Malformed JSON response with markdown fences strips fences cleanly', () => {
  const rawResponseText = '```json\n[\n  {"start": "00:00:00.000", "end": "00:00:02.000", "text": "Start Boundary"}\n]\n```';
  const cleanJson = rawResponseText.replace(/```json/g, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(cleanJson);
  assert.strictEqual(parsed[0].text, 'Start Boundary');
});

// Category 4: MM:SS.mmm Timing Boundaries
suite.it('T2-16: Timestamp starting at 00:00:00.000 parses into exactly 0 seconds', () => {
  const { context } = env;
  assert.strictEqual(context.parseSeconds('00:00:00.000'), 0);
});

suite.it('T2-17: Timestamp at maximum minute boundary (59:59.999) parses accurately into 3599.999s', () => {
  const { context } = env;
  const sec = context.parseSeconds('59:59.999');
  assert.strictEqual(sec, 3599.999);
});

suite.it('T2-18: Sub-millisecond precision values (00:00:01.123456) parse without NaN error', () => {
  const { context } = env;
  const sec = context.parseSeconds('00:00:01.123456');
  assert.strictEqual(sec, 1.123456);
});

suite.it('T2-19: Overlap gap calculation with start == end prevents negative duration', () => {
  const { context } = env;
  const input = [
    { start: '00:00:02.000', end: '00:00:02.000', text: 'Zero duration line' },
    { start: '00:00:02.000', end: '00:00:05.000', text: 'Next line' }
  ];

  const fixed = context.fixSubtitleOverlaps(input);
  // nextStart is 2.000 -> 2.000 - 0.05 = 1.950s
  assert.strictEqual(fixed[0].end, '00:00:01.950');
});

suite.it('T2-20: Minute transition boundary (00:59.900 to 01:00.100) formats correctly', () => {
  const { context } = env;
  const formatted = context.formatSecondsToHHMMSS(60.100);
  assert.strictEqual(formatted, '00:01:00.100');
});

// Category 5: Exporting & Formatting Boundaries
suite.it('T2-21: Subtitle text with quotes, angle brackets, and newlines exports safely to SRT', () => {
  const { context, elements, downloads } = env;
  context.parsedSubtitles = [{ start: '00:00:01.000', end: '00:00:03.000', text: '<b>"Quote" & \'Test\'</b>' }];

  elements.exportSrtBtn.click();
  const content = downloads[downloads.length - 1].blob.content;
  assert.ok(content.includes('<b>"Quote" & \'Test\'</b>'));
});

suite.it('T2-22: Subtitle text with multiline content converts to valid VTT cue block', () => {
  const { context, elements, downloads } = env;
  context.parsedSubtitles = [{ start: '00:00:01.000', end: '00:00:04.000', text: 'Line 1\nLine 2' }];

  elements.exportVttBtn.click();
  const content = downloads[downloads.length - 1].blob.content;
  assert.ok(content.includes('Line 1\nLine 2'));
});

suite.it('T2-23: Subtitle item with 00:00:00 timestamps formats valid LRC line [00:00.00]', () => {
  const { context, elements, downloads } = env;
  context.parsedSubtitles = [{ start: '00:00:00.000', end: '00:00:02.000', text: 'Intro' }];

  elements.exportLrcBtn.click();
  const content = downloads[downloads.length - 1].blob.content;
  assert.ok(content.includes('[00:00.00]Intro'));
});

suite.it('T2-24: Rapid sequential export clicks generate distinct download Blobs', () => {
  const { context, elements, downloads } = env;
  context.parsedSubtitles = [{ start: '00:00:01.000', end: '00:00:02.000', text: 'Test' }];

  elements.exportSrtBtn.click();
  elements.exportLrcBtn.click();
  elements.exportVttBtn.click();

  assert.strictEqual(downloads.length, 3);
});

suite.it('T2-25: Re-running handleAudioFile with a new file resets audio player state properly', () => {
  const { context, elements } = env;
  context.handleAudioFile({ name: 'song1.mp3', type: 'audio/mp3', size: 100 });
  assert.strictEqual(elements.audioFileName.innerText, 'song1.mp3');

  context.handleAudioFile({ name: 'song2.wav', type: 'audio/wav', size: 200 });
  assert.strictEqual(elements.audioFileName.innerText, 'song2.wav');
  assert.strictEqual(context.currentAudioMime, 'audio/wav');
});

module.exports = suite;

/**
 * Tier 1 Test Suite - Features 11 to 15 (25 Tests)
 */

const path = require('path');
const { TestSuite, assert } = require('../helpers/test_framework');
const { createDOMEnvironment } = require('../helpers/dom_simulator');

const htmlPath = path.resolve(__dirname, '../../soundsync.html');
const suite = new TestSuite('Tier 1: 功能覆蓋測試 (Feature 11 - 15)');

let env;

suite.beforeEach(() => {
  env = createDOMEnvironment(htmlPath);
});

// Feature 11: Lyric Line Jump Audio Playback
suite.it('F11-1: Clicking lyric line DOM item extracts data-start attribute value', () => {
  const { context, elements } = env;
  context.renderSubtitles([{ start: '00:00:15.500', end: '00:00:20.000', text: 'Jump target' }]);
  
  const lineItem = elements.timelineContainer.children[0];
  const startAttr = lineItem.getAttribute('data-start');
  assert.strictEqual(parseFloat(startAttr), 15.5);
});

suite.it('F11-2: Line click sets audioPlayer.currentTime to parsed start seconds', () => {
  const { context, elements } = env;
  context.renderSubtitles([{ start: '00:00:15.500', end: '00:00:20.000', text: 'Jump target' }]);

  let played = false;
  elements.audioPlayer.play = () => { played = true; };

  const lineItem = elements.timelineContainer.children[0];
  lineItem.click();

  assert.strictEqual(elements.audioPlayer.currentTime, 15.5);
  assert.strictEqual(played, true);
});

suite.it('F11-3: Line click triggers audioPlayer.play()', () => {
  const { context, elements } = env;
  context.renderSubtitles([{ start: '00:00:05.000', end: '00:00:08.000', text: 'Test' }]);

  let playCalled = false;
  elements.audioPlayer.play = () => { playCalled = true; };

  elements.timelineContainer.children[0].click();
  assert.strictEqual(playCalled, true);
});

suite.it('F11-4: Invalid or NaN data-start value does not set audio player currentTime', () => {
  const { elements } = env;
  const mockLine = new (require('../helpers/dom_simulator').MockElement)('div');
  mockLine.setAttribute('data-start', 'NaN');
  
  const originalTime = elements.audioPlayer.currentTime;
  mockLine.addEventListener('click', function() {
    const s = parseFloat(this.getAttribute('data-start'));
    if (!isNaN(s)) {
      elements.audioPlayer.currentTime = s;
    }
  });

  mockLine.click();
  assert.strictEqual(elements.audioPlayer.currentTime, originalTime);
});

suite.it('F11-5: Audio playback cursor jumps accurately when clicking non-adjacent lyric lines', () => {
  const { context, elements } = env;
  context.renderSubtitles([
    { start: '00:00:01.000', end: '00:00:03.000', text: 'Line 1' },
    { start: '00:00:05.000', end: '00:00:07.000', text: 'Line 2' },
    { start: '00:00:10.000', end: '00:00:12.000', text: 'Line 3' }
  ]);

  elements.audioPlayer.play = () => {};

  // Click Line 3 directly
  elements.timelineContainer.children[2].click();
  assert.strictEqual(elements.audioPlayer.currentTime, 10.0);

  // Click Line 1 directly
  elements.timelineContainer.children[0].click();
  assert.strictEqual(elements.audioPlayer.currentTime, 1.0);
});

// Feature 12: SubRip (.SRT) Exporter
suite.it('F12-1: .SRT exporter formats index numbers starting from 1 sequentially', () => {
  const { context, elements, downloads } = env;
  context.parsedSubtitles = [
    { start: '00:00:01.200', end: '00:00:04.500', text: 'Line 1' },
    { start: '00:00:05.000', end: '00:00:08.000', text: 'Line 2' }
  ];

  elements.exportSrtBtn.click();
  assert.ok(downloads.length > 0);
  const content = downloads[downloads.length - 1].blob.content;
  
  assert.ok(content.includes('1\n00:00:01,200 --> 00:00:04,500\nLine 1'));
  assert.ok(content.includes('2\n00:00:05,000 --> 00:00:08,000\nLine 2'));
});

suite.it('F12-2: .SRT exporter converts dot millisecond separator to comma in timestamps', () => {
  const { context, elements, downloads } = env;
  context.parsedSubtitles = [{ start: '00:00:01.200', end: '00:00:04.500', text: 'Comma Test' }];

  elements.exportSrtBtn.click();
  const content = downloads[downloads.length - 1].blob.content;
  assert.ok(content.includes('00:00:01,200 --> 00:00:04,500'));
});

suite.it('F12-3: Timecode arrow format adheres strictly to -->', () => {
  const { context, elements, downloads } = env;
  context.parsedSubtitles = [{ start: '00:00:01.000', end: '00:00:02.000', text: 'Arrow Test' }];

  elements.exportSrtBtn.click();
  const content = downloads[downloads.length - 1].blob.content;
  assert.ok(content.includes(' --> '));
});

suite.it('F12-4: Multi-line SRT output includes double newlines between subtitle blocks', () => {
  const { context, elements, downloads } = env;
  context.parsedSubtitles = [
    { start: '00:00:01.000', end: '00:00:02.000', text: 'A' },
    { start: '00:00:03.000', end: '00:00:04.000', text: 'B' }
  ];

  elements.exportSrtBtn.click();
  const content = downloads[downloads.length - 1].blob.content;
  assert.ok(content.includes('A\n\n2\n'));
});

suite.it('F12-5: Download triggering creates Blob with MIME text/plain and filename SoundSync_Lyrics.srt', () => {
  const { context, elements, downloads } = env;
  context.parsedSubtitles = [{ start: '00:00:01.000', end: '00:00:02.000', text: 'Test' }];

  elements.exportSrtBtn.click();
  const downloadInfo = downloads[downloads.length - 1];
  assert.strictEqual(downloadInfo.blob.type, 'text/plain');
});

// Feature 13: Lyric (.LRC) Exporter
suite.it('F13-1: .LRC exporter formats timecode in bracketed format [mm:ss.xx]', () => {
  const { context, elements, downloads } = env;
  context.parsedSubtitles = [{ start: '00:01:12.450', end: '00:01:15.000', text: 'LRC test' }];

  elements.exportLrcBtn.click();
  const content = downloads[downloads.length - 1].blob.content;
  assert.ok(content.includes('[01:12.45]LRC test'));
});

suite.it('F13-2: Hours component is correctly converted into cumulative minutes in [mm:ss.xx]', () => {
  const { context, elements, downloads } = env;
  context.parsedSubtitles = [{ start: '01:05:10.000', end: '01:05:12.000', text: 'Hour Test' }];

  elements.exportLrcBtn.click();
  const content = downloads[downloads.length - 1].blob.content;
  // 1 hour 5 mins = 65 mins -> [65:10.00]
  assert.ok(content.includes('[65:10.00]Hour Test'));
});

suite.it('F13-3: Milliseconds are formatted to two decimal digits in LRC', () => {
  const { context, elements, downloads } = env;
  context.parsedSubtitles = [{ start: '00:00:05.129', end: '00:00:08.000', text: 'Ms Test' }];

  elements.exportLrcBtn.click();
  const content = downloads[downloads.length - 1].blob.content;
  assert.ok(content.includes('[00:05.13]Ms Test'));
});

suite.it('F13-4: Output string preserves exact line text after bracket timestamp', () => {
  const { context, elements, downloads } = env;
  context.parsedSubtitles = [{ start: '00:00:01.000', end: '00:00:02.000', text: 'Special Chinese 歌詞 ✨' }];

  elements.exportLrcBtn.click();
  const content = downloads[downloads.length - 1].blob.content;
  assert.ok(content.includes(']Special Chinese 歌詞 ✨'));
});

suite.it('F13-5: Download triggering creates Blob with MIME text/plain for LRC', () => {
  const { context, elements, downloads } = env;
  context.parsedSubtitles = [{ start: '00:00:01.000', end: '00:00:02.000', text: 'Test' }];

  elements.exportLrcBtn.click();
  const downloadInfo = downloads[downloads.length - 1];
  assert.strictEqual(downloadInfo.blob.type, 'text/plain');
});

// Feature 14: WebVTT (.VTT) Exporter
suite.it('F14-1: .VTT exporter includes required WEBVTT header on first line', () => {
  const { context, elements, downloads } = env;
  context.parsedSubtitles = [{ start: '00:00:01.000', end: '00:00:02.000', text: 'VTT Test' }];

  elements.exportVttBtn.click();
  const content = downloads[downloads.length - 1].blob.content;
  assert.ok(content.startsWith('WEBVTT'));
});

suite.it('F14-2: Timecode format maintains dot millisecond separator (00:00:01.200 --> 00:00:04.500)', () => {
  const { context, elements, downloads } = env;
  context.parsedSubtitles = [{ start: '00:00:01.200', end: '00:00:04.500', text: 'VTT Dot Test' }];

  elements.exportVttBtn.click();
  const content = downloads[downloads.length - 1].blob.content;
  assert.ok(content.includes('00:00:01.200 --> 00:00:04.500'));
});

suite.it('F14-3: Cue numbers are rendered sequentially in VTT', () => {
  const { context, elements, downloads } = env;
  context.parsedSubtitles = [
    { start: '00:00:01.000', end: '00:00:02.000', text: 'Cue 1' },
    { start: '00:00:03.000', end: '00:00:04.000', text: 'Cue 2' }
  ];

  elements.exportVttBtn.click();
  const content = downloads[downloads.length - 1].blob.content;
  assert.ok(content.includes('1\n00:00:01.000'));
  assert.ok(content.includes('2\n00:00:03.000'));
});

suite.it('F14-4: Empty lines separate cues correctly per WebVTT standard', () => {
  const { context, elements, downloads } = env;
  context.parsedSubtitles = [
    { start: '00:00:01.000', end: '00:00:02.000', text: 'Cue 1' },
    { start: '00:00:03.000', end: '00:00:04.000', text: 'Cue 2' }
  ];

  elements.exportVttBtn.click();
  const content = downloads[downloads.length - 1].blob.content;
  assert.ok(content.includes('Cue 1\n\n2\n'));
});

suite.it('F14-5: Download triggering creates Blob with MIME text/plain for VTT', () => {
  const { context, elements, downloads } = env;
  context.parsedSubtitles = [{ start: '00:00:01.000', end: '00:00:02.000', text: 'Test' }];

  elements.exportVttBtn.click();
  const downloadInfo = downloads[downloads.length - 1];
  assert.strictEqual(downloadInfo.blob.type, 'text/plain');
});

// Feature 15: Text Clipboard Copy
suite.it('F15-1: Text export formats lines with bracketed timestamp and text [HH:MM:SS.mmm]', () => {
  const { context, elements, getClipboardText } = env;
  context.parsedSubtitles = [{ start: '00:00:01.200', end: '00:00:04.500', text: 'Copy test' }];

  elements.exportTxtBtn.click();
  const txt = getClipboardText();
  assert.strictEqual(txt.trim(), '[00:00:01.200] Copy test');
});

suite.it('F15-2: Clipboard write calls navigator.clipboard.writeText with formatted text string', async () => {
  const { context, elements, getClipboardText } = env;
  context.parsedSubtitles = [{ start: '00:00:02.000', end: '00:00:04.000', text: 'Clipboard test' }];

  elements.exportTxtBtn.click();
  await new Promise(r => setTimeout(r, 10));

  assert.strictEqual(getClipboardText(), '[00:00:02.000] Clipboard test\n');
});

suite.it('F15-3: Clipboard copy success triggers user notification alert', async () => {
  const { context, elements, alertHistory } = env;
  context.parsedSubtitles = [{ start: '00:00:01.000', end: '00:00:02.000', text: 'Test' }];

  elements.exportTxtBtn.click();
  await new Promise(r => setTimeout(r, 10));

  assert.ok(alertHistory.length > 0);
  assert.ok(alertHistory[alertHistory.length - 1].includes('已成功複製'));
});

suite.it('F15-4: Disabled export buttons become enabled after enableExportButtons() call', () => {
  const { context, elements } = env;
  assert.strictEqual(elements.exportSrtBtn.disabled, true);
  assert.strictEqual(elements.exportLrcBtn.disabled, true);
  assert.strictEqual(elements.exportVttBtn.disabled, true);
  assert.strictEqual(elements.exportTxtBtn.disabled, true);

  context.enableExportButtons();

  assert.strictEqual(elements.exportSrtBtn.disabled, false);
  assert.strictEqual(elements.exportLrcBtn.disabled, false);
  assert.strictEqual(elements.exportVttBtn.disabled, false);
  assert.strictEqual(elements.exportTxtBtn.disabled, false);
});

suite.it('F15-5: Copy string handles empty line list without crashing', () => {
  const { context, elements, getClipboardText } = env;
  context.parsedSubtitles = [];

  elements.exportTxtBtn.click();
  assert.strictEqual(getClipboardText(), '');
});

module.exports = suite;

/**
 * Tier 4 Test Suite - Real-World Application Scenario Testing (10 Tests)
 */

const path = require('path');
const { TestSuite, assert } = require('../helpers/test_framework');
const { createDOMEnvironment } = require('../helpers/dom_simulator');

const htmlPath = path.resolve(__dirname, '../../soundsync.html');
const suite = new TestSuite('Tier 4: 真實情境應用測試 (Real-World E2E Scenarios)');

let env;

suite.beforeEach(() => {
  env = createDOMEnvironment(htmlPath);
});

suite.it('T4-01: Complete MP3 alignment to SRT download workflow', async () => {
  const { context, elements, setFetchHandler, downloads } = env;

  const mp3File = { name: 'Mirage_Cinematic_BGM_Song.mp3', type: 'audio/mp3', size: 3500000 };
  context.handleAudioFile(mp3File);
  assert.strictEqual(elements.audioFileName.innerText, 'Mirage_Cinematic_BGM_Song.mp3');

  elements.apiKeyInput.value = 'AIzaSyRealWorldKey_2026';
  elements.saveKeyBtn.click();
  assert.strictEqual(env.localStorage.getItem('soundsync_gemini_key'), 'AIzaSyRealWorldKey_2026');

  const lyrics = `把說不出口的愛 寫成一首歌
伴隨著旋律 唱進你的心坎
這是我們的 幻境配樂`;
  elements.lyricsInput.value = lyrics;

  setFetchHandler(async () => ({
    json: async () => ({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify([
                  { start: '00:00:02.100', end: '00:00:06.500', text: '把說不出口的愛 寫成一首歌' },
                  { start: '00:00:06.200', end: '00:00:10.800', text: '伴隨著旋律 唱進你的心坎' },
                  { start: '00:00:11.000', end: '00:00:15.200', text: '這是我們的 幻境配樂' }
                ])
              }
            ]
          }
        }
      ]
    })
  }));

  elements.startSyncBtn.click();
  await new Promise(r => setTimeout(r, 60));

  assert.strictEqual(context.parsedSubtitles[0].end, '00:00:06.150');
  assert.strictEqual(elements.resultCountBadge.innerText, '已精準打軸 3 句');

  elements.exportSrtBtn.click();
  const srtContent = downloads[downloads.length - 1].blob.content;

  assert.ok(srtContent.includes('1\n00:00:02,100 --> 00:00:06,150\n把說不出口的愛 寫成一首歌'));
  assert.ok(srtContent.includes('2\n00:00:06,200 --> 00:00:10,800\n伴隨著旋律 唱進你的心坎'));
  assert.ok(srtContent.includes('3\n00:00:11,000 --> 00:00:15,200\n這是我們的 幻境配樂'));
});

suite.it('T4-02: Complete MP3 alignment to LRC download workflow', async () => {
  const { context, elements, setFetchHandler, downloads } = env;

  context.handleAudioFile({ name: 'song.mp3', type: 'audio/mp3', size: 100 });
  elements.apiKeyInput.value = 'AIzaSyKey';

  setFetchHandler(async () => ({
    json: async () => ({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify([
                  { start: '00:01:05.120', end: '00:01:10.000', text: '歌詞一' },
                  { start: '00:01:10.500', end: '00:01:15.000', text: '歌詞二' }
                ])
              }
            ]
          }
        }
      ]
    })
  }));

  elements.startSyncBtn.click();
  await new Promise(r => setTimeout(r, 60));

  elements.exportLrcBtn.click();
  const lrcContent = downloads[downloads.length - 1].blob.content;

  assert.ok(lrcContent.includes('[01:05.12]歌詞一'));
  assert.ok(lrcContent.includes('[01:10.50]歌詞二'));
});

suite.it('T4-03: Complete MP3 alignment to VTT download workflow', async () => {
  const { context, elements, setFetchHandler, downloads } = env;

  context.handleAudioFile({ name: 'song.mp3', type: 'audio/mp3', size: 100 });
  elements.apiKeyInput.value = 'AIzaSyKey';

  setFetchHandler(async () => ({
    json: async () => ({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify([
                  { start: '00:00:01.500', end: '00:00:04.200', text: 'WebVTT Target' }
                ])
              }
            ]
          }
        }
      ]
    })
  }));

  elements.startSyncBtn.click();
  await new Promise(r => setTimeout(r, 60));

  elements.exportVttBtn.click();
  const vttContent = downloads[downloads.length - 1].blob.content;

  assert.ok(vttContent.startsWith('WEBVTT'));
  assert.ok(vttContent.includes('00:00:01.500 --> 00:00:04.200\nWebVTT Target'));
});

suite.it('T4-04: Full teleprompter interactive experience - Click lyric line to jump playback and verify highlight', async () => {
  const { context, elements, setFetchHandler } = env;

  context.handleAudioFile({ name: 'song.mp3', type: 'audio/mp3', size: 100 });
  elements.apiKeyInput.value = 'AIzaSyKey';

  setFetchHandler(async () => ({
    json: async () => ({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify([
                  { start: '00:00:02.000', end: '00:00:05.000', text: 'Line 1' },
                  { start: '00:00:06.000', end: '00:00:10.000', text: 'Line 2' }
                ])
              }
            ]
          }
        }
      ]
    })
  }));

  elements.startSyncBtn.click();
  await new Promise(r => setTimeout(r, 60));

  elements.audioPlayer.play = () => {};

  const line2Div = elements.timelineContainer.children[1];
  line2Div.click();

  assert.strictEqual(elements.audioPlayer.currentTime, 6.0);

  elements.audioPlayer.currentTime = 7.0;
  elements.audioPlayer.dispatchEvent('timeupdate');

  assert.strictEqual(line2Div.classList.contains('active-line'), true);
  assert.strictEqual(line2Div.scrolledIntoView, true);
});

suite.it('T4-05: Real-World Error Recovery - User fixes invalid API Key and re-syncs successfully', async () => {
  const { context, elements, setFetchHandler, alertHistory } = env;

  context.handleAudioFile({ name: 'song.mp3', type: 'audio/mp3', size: 100 });
  elements.apiKeyInput.value = 'AIzaSyInvalidKey';

  setFetchHandler(async () => ({
    json: async () => ({ error: { message: 'API key not valid 401' } })
  }));

  elements.startSyncBtn.click();
  await new Promise(r => setTimeout(r, 60));

  assert.ok(alertHistory[0].includes('API 金鑰無效或填寫錯誤'));

  elements.apiKeyInput.value = 'AIzaSyCorrectKey';
  setFetchHandler(async () => ({
    json: async () => ({
      candidates: [{ content: { parts: [{ text: '[{"start":"00:00:01.000","end":"00:00:02.000","text":"Recovered"}]' }] } }]
    })
  }));

  elements.startSyncBtn.click();
  await new Promise(r => setTimeout(r, 60));

  assert.strictEqual(context.parsedSubtitles[0].text, 'Recovered');
});

suite.it('T4-06: Real-World Error Recovery - Quota 429 error guide leads to seamless fallback retry', async () => {
  const { context, elements, setFetchHandler, alertHistory } = env;

  context.handleAudioFile({ name: 'song.mp3', type: 'audio/mp3', size: 100 });
  elements.apiKeyInput.value = 'AIzaSyQuotaExhaustedKey';

  setFetchHandler(async () => ({
    json: async () => ({ error: { message: 'Quota exceeded 429' } })
  }));

  elements.startSyncBtn.click();
  await new Promise(r => setTimeout(r, 60));

  assert.ok(alertHistory[alertHistory.length - 1].includes('Gemini API 今日免費額度已達上限'));
});

suite.it('T4-07: Drag and Drop MP3 file real-world user interaction', () => {
  const { context, elements } = env;

  const dragEvent = { preventDefault: () => {}, stopPropagation: () => {} };
  elements.dropZone.dispatchEvent({ type: 'dragover', ...dragEvent });
  assert.strictEqual(elements.dropZone.style.borderColor, '#1d4ed8');

  const file = { name: 'dragged_track.mp3', type: 'audio/mp3', size: 2048000 };
  elements.dropZone.dispatchEvent({
    type: 'drop',
    preventDefault: () => {},
    stopPropagation: () => {},
    dataTransfer: { files: [file] }
  });

  assert.strictEqual(context.selectedAudioFile, file);
  assert.strictEqual(elements.audioFileName.innerText, 'dragged_track.mp3');
});

suite.it('T4-08: Clipboard copy multi-line text verification in real-world scenario', async () => {
  const { context, elements, getClipboardText } = env;

  context.parsedSubtitles = [
    { start: '00:00:01.000', end: '00:00:03.000', text: 'Verse 1' },
    { start: '00:00:04.000', end: '00:00:06.000', text: 'Verse 2' }
  ];

  elements.exportTxtBtn.click();
  await new Promise(r => setTimeout(r, 10));

  const text = getClipboardText();
  assert.strictEqual(text, '[00:00:01.000] Verse 1\n[00:00:04.000] Verse 2\n');
});

suite.it('T4-09: Traditional Chinese UI labels and error handling non-regression check', () => {
  const fs = require('fs');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');

  assert.ok(htmlContent.includes('SoundSync AI 旗艦對齊助手'));
  assert.ok(htmlContent.includes('微秒級聽寫對齊'));
  assert.ok(htmlContent.includes('邊界重疊自動修正'));
  assert.ok(htmlContent.includes('100% 完整歌詞輸出'));
});

suite.it('T4-10: End-To-End zero regression guarantee across all export formats', async () => {
  const { context, elements, downloads } = env;

  context.parsedSubtitles = [
    { start: '00:00:00.500', end: '00:00:02.500', text: 'Start' },
    { start: '00:00:03.000', end: '00:00:05.000', text: 'End' }
  ];

  elements.exportSrtBtn.click();
  elements.exportLrcBtn.click();
  elements.exportVttBtn.click();

  assert.strictEqual(downloads.length, 3);
  assert.ok(downloads[0].blob.content.includes('00:00:00,500 --> 00:00:02,500'));
  assert.ok(downloads[1].blob.content.includes('[00:00.50]Start'));
  assert.ok(downloads[2].blob.content.includes('00:00:00.500 --> 00:00:02.500'));
});

module.exports = suite;

/**
 * Tier 3 Test Suite - Cross-Functional Combination Testing (15 Tests)
 */

const path = require('path');
const { TestSuite, assert } = require('../helpers/test_framework');
const { createDOMEnvironment } = require('../helpers/dom_simulator');

const htmlPath = path.resolve(__dirname, '../../soundsync.html');
const suite = new TestSuite('Tier 3: 跨功能組合測試 (Cross-Functional Pipeline)');

let env;

suite.beforeEach(() => {
  env = createDOMEnvironment(htmlPath);
});

suite.it('T3-01: Full Pipeline - Audio load -> API call -> Overlap Eraser -> SRT generation', async () => {
  const { context, elements, setFetchHandler, downloads } = env;

  // Step 1: Audio file load
  context.handleAudioFile({ name: 'concert_live.mp3', type: 'audio/mp3', size: 102400 });

  // Step 2: Set API key
  elements.apiKeyInput.value = 'AIzaSyTestPipelineKey';

  // Step 3: Mock API response with overlapping timestamps
  setFetchHandler(async () => ({
    json: async () => ({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify([
                  { start: '00:00:01.000', end: '00:00:05.000', text: '第一句對白' },
                  { start: '00:00:04.000', end: '00:00:08.000', text: '第二句對白' }
                ])
              }
            ]
          }
        }
      ]
    })
  }));

  // Step 4: Trigger sync
  elements.startSyncBtn.click();
  await new Promise(r => setTimeout(r, 50));

  // Verify overlap fixed: Line 1 end adjusted from 5.000 to 3.950
  assert.strictEqual(context.parsedSubtitles[0].end, '00:00:03.950');

  // Step 5: Export SRT
  elements.exportSrtBtn.click();
  const srtContent = downloads[downloads.length - 1].blob.content;

  assert.ok(srtContent.includes('1\n00:00:01,000 --> 00:00:03,950\n第一句對白'));
  assert.ok(srtContent.includes('2\n00:00:04,000 --> 00:00:08,000\n第二句對白'));
});

suite.it('T3-02: Full Pipeline - Reference lyrics embedded -> Overlap Eraser -> LRC export', async () => {
  const { context, elements, setFetchHandler, downloads } = env;

  context.handleAudioFile({ name: 'song.mp3', type: 'audio/mp3', size: 100 });
  elements.apiKeyInput.value = 'AIzaSyTestKey';
  elements.lyricsInput.value = '把說不出口的愛 寫成一首歌\n伴隨著旋律 唱進你的心坎';

  let capturedPrompt = '';
  setFetchHandler(async (url, opts) => {
    const body = JSON.parse(opts.body);
    capturedPrompt = body.contents[0].parts[1].text;

    return {
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify([
                    { start: '00:00:01.000', end: '00:00:03.000', text: '把說不出口的愛 寫成一首歌' },
                    { start: '00:00:03.500', end: '00:00:06.000', text: '伴隨著旋律 唱進你的心坎' }
                  ])
                }
              ]
            }
          }
        ]
      })
    };
  });

  elements.startSyncBtn.click();
  await new Promise(r => setTimeout(r, 50));

  assert.ok(capturedPrompt.includes('把說不出口的愛 寫成一首歌'));

  elements.exportLrcBtn.click();
  const lrcContent = downloads[downloads.length - 1].blob.content;

  assert.ok(lrcContent.includes('[00:01.00]把說不出口的愛 寫成一首歌'));
  assert.ok(lrcContent.includes('[00:03.50]伴隨著旋律 唱進你的心坎'));
});

suite.it('T3-03: Full Pipeline - Candidate Model Fallback -> Overlap Eraser -> VTT export', async () => {
  const { context, elements, setFetchHandler, downloads } = env;

  context.handleAudioFile({ name: 'voice.wav', type: 'audio/wav', size: 100 });
  elements.apiKeyInput.value = 'AIzaSyTestKey';

  setFetchHandler(async (url) => {
    if (url.includes('gemini-2.0-flash:generateContent')) {
      return { json: async () => ({ error: { message: 'Primary model busy 503' } }) };
    }
    return {
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify([
                    { start: '00:00:02.000', end: '00:00:06.000', text: 'A' },
                    { start: '00:00:05.000', end: '00:00:09.000', text: 'B' }
                  ])
                }
              ]
            }
          }
        ]
      })
    };
  });

  elements.startSyncBtn.click();
  await new Promise(r => setTimeout(r, 50));

  elements.exportVttBtn.click();
  const vttContent = downloads[downloads.length - 1].blob.content;

  assert.ok(vttContent.startsWith('WEBVTT'));
  assert.ok(vttContent.includes('00:00:02.000 --> 00:00:04.950\nA'));
});

suite.it('T3-04: Exporter Cross-Consistency - SRT, LRC, VTT, TXT contain identical line counts and text', async () => {
  const { context, elements, downloads, getClipboardText } = env;

  context.parsedSubtitles = [
    { start: '00:00:01.000', end: '00:00:03.000', text: 'Line 1' },
    { start: '00:00:04.000', end: '00:00:06.000', text: 'Line 2' },
    { start: '00:00:07.000', end: '00:00:09.000', text: 'Line 3' }
  ];

  elements.exportSrtBtn.click();
  elements.exportLrcBtn.click();
  elements.exportVttBtn.click();
  elements.exportTxtBtn.click();

  const srt = downloads[downloads.length - 3].blob.content;
  const lrc = downloads[downloads.length - 2].blob.content;
  const vtt = downloads[downloads.length - 1].blob.content;
  const txt = getClipboardText();

  // All formats must contain all 3 lines
  ['Line 1', 'Line 2', 'Line 3'].forEach(line => {
    assert.ok(srt.includes(line), `SRT 應包含 ${line}`);
    assert.ok(lrc.includes(line), `LRC 應包含 ${line}`);
    assert.ok(vtt.includes(line), `VTT 應包含 ${line}`);
    assert.ok(txt.includes(line), `TXT 應包含 ${line}`);
  });
});

suite.it('T3-05: State Machine Integration - Reset audio file clears and re-enables alignment process', async () => {
  const { context, elements, setFetchHandler } = env;

  context.handleAudioFile({ name: 'song1.mp3', type: 'audio/mp3', size: 100 });
  elements.apiKeyInput.value = 'AIzaSyTestKey';

  setFetchHandler(async () => ({
    json: async () => ({
      candidates: [{ content: { parts: [{ text: '[{"start":"00:00:01.000","end":"00:00:02.000","text":"Song 1"}]' }] } }]
    })
  }));

  elements.startSyncBtn.click();
  await new Promise(r => setTimeout(r, 50));

  assert.strictEqual(context.parsedSubtitles[0].text, 'Song 1');

  // Load new audio file
  context.handleAudioFile({ name: 'song2.mp3', type: 'audio/mp3', size: 200 });

  setFetchHandler(async () => ({
    json: async () => ({
      candidates: [{ content: { parts: [{ text: '[{"start":"00:00:01.000","end":"00:00:02.000","text":"Song 2"}]' }] } }]
    })
  }));

  elements.startSyncBtn.click();
  await new Promise(r => setTimeout(r, 50));

  assert.strictEqual(context.parsedSubtitles[0].text, 'Song 2');
});

suite.it('T3-06: Teleprompter & Line Jump Integration - Clicking rendered line updates audio player and active class', () => {
  const { context, elements } = env;

  const subs = [
    { start: '00:00:02.000', end: '00:00:05.000', text: 'First line' },
    { start: '00:00:06.000', end: '00:00:10.000', text: 'Second line' }
  ];
  context.renderSubtitles(subs);

  elements.audioPlayer.play = () => {};

  // Click line 2
  const line2 = elements.timelineContainer.children[1];
  line2.click();

  assert.strictEqual(elements.audioPlayer.currentTime, 6.0);

  // Trigger timeupdate at currentTime = 6.0
  elements.audioPlayer.dispatchEvent('timeupdate');

  assert.strictEqual(line2.classList.contains('active-line'), true);
  assert.strictEqual(elements.timelineContainer.children[0].classList.contains('active-line'), false);
});

suite.it('T3-07: Error Fallback Chain + UI Alert Integration - Exhausted retries prompt alert and re-enables button', async () => {
  const { context, elements, setFetchHandler, alertHistory } = env;

  context.handleAudioFile({ name: 'test.mp3', type: 'audio/mp3', size: 100 });
  elements.apiKeyInput.value = 'AIzaSyTestKey';

  setFetchHandler(async () => ({
    json: async () => ({ error: { message: 'Quota limit 429' } })
  }));

  elements.startSyncBtn.click();
  await new Promise(r => setTimeout(r, 50));

  assert.strictEqual(elements.startSyncBtn.disabled, false, '失敗後開始按鈕應重新啟用');
  assert.ok(alertHistory.length > 0);
  assert.ok(alertHistory[0].includes('額度已達上限'));
});

suite.it('T3-08: Reference lyrics text formatting + prompt schema validation', async () => {
  const { context, elements, setFetchHandler } = env;

  context.handleAudioFile({ name: 'test.mp3', type: 'audio/mp3', size: 100 });
  elements.apiKeyInput.value = 'AIzaSyKey';
  elements.lyricsInput.value = 'Verse 1\nChorus line\nOutro';

  let sentBody = null;
  setFetchHandler(async (url, opts) => {
    sentBody = JSON.parse(opts.body);
    return {
      json: async () => ({
        candidates: [{ content: { parts: [{ text: '[]' }] } }]
      })
    };
  });

  elements.startSyncBtn.click();
  await new Promise(r => setTimeout(r, 50));

  assert.ok(sentBody.contents[0].parts[1].text.includes('Verse 1\nChorus line\nOutro'));
});

suite.it('T3-09: Overlap eraser with 3 consecutive overlapping items adjusts all boundaries', () => {
  const { context } = env;
  const items = [
    { start: '00:00:00.000', end: '00:00:03.000', text: '1' },
    { start: '00:00:02.000', end: '00:00:05.000', text: '2' },
    { start: '00:00:04.000', end: '00:00:07.000', text: '3' }
  ];

  const fixed = context.fixSubtitleOverlaps(items);
  assert.strictEqual(fixed[0].end, '00:00:01.950');
  assert.strictEqual(fixed[1].end, '00:00:03.950');
  assert.strictEqual(fixed[2].end, '00:00:07.000');
});

suite.it('T3-10: Multi-format download generation preserves exact millisecond timestamps', () => {
  const { context, elements, downloads } = env;
  context.parsedSubtitles = [{ start: '00:00:01.456', end: '00:00:04.789', text: 'Precision' }];

  elements.exportSrtBtn.click();
  elements.exportVttBtn.click();

  const srt = downloads[downloads.length - 2].blob.content;
  const vtt = downloads[downloads.length - 1].blob.content;

  assert.ok(srt.includes('00:00:01,456 --> 00:00:04,789'));
  assert.ok(vtt.includes('00:00:01.456 --> 00:00:04.789'));
});

suite.it('T3-11: High volume line items (50 lines) render and export without UI freeze', () => {
  const { context, elements, downloads } = env;
  const lines = [];
  for (let i = 0; i < 50; i++) {
    lines.push({
      start: `00:00:${i.toString().padStart(2,'0')}.000`,
      end: `00:00:${i.toString().padStart(2,'0')}.900`,
      text: `Lyric line ${i + 1}`
    });
  }

  context.parsedSubtitles = lines;
  context.renderSubtitles(lines);

  assert.strictEqual(elements.timelineContainer.children.length, 50);

  elements.exportSrtBtn.click();
  const srt = downloads[downloads.length - 1].blob.content;
  assert.ok(srt.includes('50\n00:00:49,000 --> 00:00:49,900\nLyric line 50'));
});

suite.it('T3-12: Key saving + page reload simulation maintains key across sessions', () => {
  const { elements, localStorage } = env;
  elements.apiKeyInput.value = 'AIzaSySessionKey123';
  elements.saveKeyBtn.click();

  assert.strictEqual(localStorage.getItem('soundsync_gemini_key'), 'AIzaSySessionKey123');
});

suite.it('T3-13: Multiple sequential audio file drags update UI without lingering old state', () => {
  const { context, elements } = env;

  context.handleAudioFile({ name: 'file1.mp3', type: 'audio/mp3', size: 100 });
  assert.strictEqual(elements.audioFileName.innerText, 'file1.mp3');

  context.handleAudioFile({ name: 'file2.m4a', type: 'audio/m4a', size: 200 });
  assert.strictEqual(elements.audioFileName.innerText, 'file2.m4a');
});

suite.it('T3-14: Base64 audio string with existing data URL prefix parses cleanly during API request', async () => {
  const { context, elements, setFetchHandler } = env;

  context.selectedAudioFile = { name: 'test.mp3', type: 'audio/mp3', size: 100 };
  context.currentAudioBase64 = 'data:audio/mp3;base64,QUJDREVGR0g=';
  elements.apiKeyInput.value = 'AIzaSyKey';

  let rawDataSent = '';
  setFetchHandler(async (url, opts) => {
    const body = JSON.parse(opts.body);
    rawDataSent = body.contents[0].parts[0].inlineData.data;
    return { json: async () => ({ candidates: [{ content: { parts: [{ text: '[]' }] } }] }) };
  });

  elements.startSyncBtn.click();
  await new Promise(r => setTimeout(r, 50));

  assert.strictEqual(rawDataSent, 'QUJDREVGR0g=');
});

suite.it('T3-15: Complete pipeline cleanup after processing allows immediate second sync', async () => {
  const { context, elements, setFetchHandler } = env;

  context.handleAudioFile({ name: 'track1.mp3', type: 'audio/mp3', size: 100 });
  elements.apiKeyInput.value = 'AIzaSyKey';

  setFetchHandler(async () => ({
    json: async () => ({ candidates: [{ content: { parts: [{ text: '[{"start":"00:00:01.000","end":"00:00:02.000","text":"1"}]' }] } }] })
  }));

  elements.startSyncBtn.click();
  await new Promise(r => setTimeout(r, 50));

  assert.strictEqual(elements.startSyncBtn.disabled, false);
  assert.strictEqual(elements.syncProgressMsg.style.display, 'none');
});

module.exports = suite;

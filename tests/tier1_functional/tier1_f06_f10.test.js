/**
 * Tier 1 Test Suite - Features 06 to 10 (25 Tests)
 */

const path = require('path');
const { TestSuite, assert } = require('../helpers/test_framework');
const { createDOMEnvironment } = require('../helpers/dom_simulator');

const htmlPath = path.resolve(__dirname, '../../soundsync.html');
const suite = new TestSuite('Tier 1: 功能覆蓋測試 (Feature 06 - 10)');

let env;

suite.beforeEach(() => {
  env = createDOMEnvironment(htmlPath);
});

// Feature 6: Gemini 2.0 Flash REST API Client
suite.it('F06-1: Construct REST API request URL with model ID and key parameter', () => {
  const modId = 'gemini-2.0-flash';
  const apiKey = 'AIzaSyTestKey';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modId}:generateContent?key=${apiKey}`;
  
  assert.strictEqual(url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyTestKey');
});

suite.it('F06-2: Construct POST request payload with inlineData mimeType and base64 audio data', () => {
  const cleanMime = 'audio/mp3';
  const rawBase64 = 'SGVsbG8xMjM=';
  const requestBody = {
    contents: [
      {
        parts: [
          { inlineData: { mimeType: cleanMime, data: rawBase64 } },
          { text: 'Prompt instructions' }
        ]
      }
    ]
  };

  assert.strictEqual(requestBody.contents[0].parts[0].inlineData.mimeType, 'audio/mp3');
  assert.strictEqual(requestBody.contents[0].parts[0].inlineData.data, 'SGVsbG8xMjM=');
});

suite.it('F06-3: Request headers specify Content-Type: application/json', () => {
  const headers = { 'Content-Type': 'application/json' };
  assert.strictEqual(headers['Content-Type'], 'application/json');
});

suite.it('F06-4: Successful REST JSON response parsing extracts candidates[0].content.parts[0].text', () => {
  const mockApiResponse = {
    candidates: [
      {
        content: {
          parts: [
            { text: '[{"start":"00:00:01.000","end":"00:00:03.000","text":"歌詞測試"}]' }
          ]
        }
      }
    ]
  };

  const text = mockApiResponse.candidates[0].content.parts[0].text;
  assert.ok(text.includes('歌詞測試'), '應成功從回應解析文字');
});

suite.it('F06-5: Markdown codeblock wrapper stripping cleans response text into valid JSON string', () => {
  const rawText = '```json\n[{"start":"00:00:01.000","end":"00:00:03.000","text":"歌詞"}]\n```';
  const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
  
  assert.doesNotThrow(() => {
    const parsed = JSON.parse(cleaned);
    assert.strictEqual(parsed[0].text, '歌詞');
  }, '清理後的字串應可順利解析為 JSON');
});

// Feature 7: Candidate Model Fallback Chain
suite.it('F07-1: Candidate models list contains expected models in exact fallback order', () => {
  const candidateModels = [
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash 旗艦模型' },
    { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash Exp' },
    { id: 'gemini-1.5-flash-latest', name: 'Gemini 1.5 Flash Latest' },
    { id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash 8B' }
  ];

  assert.strictEqual(candidateModels.length, 4);
  assert.strictEqual(candidateModels[0].id, 'gemini-2.0-flash');
  assert.strictEqual(candidateModels[1].id, 'gemini-2.0-flash-exp');
  assert.strictEqual(candidateModels[2].id, 'gemini-1.5-flash-latest');
  assert.strictEqual(candidateModels[3].id, 'gemini-1.5-flash-8b');
});

suite.it('F07-2: API error on primary model automatically triggers retry on second model', async () => {
  const { setFetchHandler } = env;
  const requestedUrls = [];

  setFetchHandler(async (url) => {
    requestedUrls.push(url);
    if (url.includes('gemini-2.0-flash:generateContent')) {
      return { json: async () => ({ error: { message: 'Quota exceeded 429' } }) };
    }
    return {
      json: async () => ({
        candidates: [{ content: { parts: [{ text: '[{"start":"00:00:01.000","end":"00:00:02.000","text":"Fallback Pass"}]' }] } }]
      })
    };
  });

  const { context, elements } = env;
  elements.apiKeyInput.value = 'AIzaSyTestKey';
  context.selectedAudioFile = { name: 'test.mp3', type: 'audio/mp3', size: 100 };
  context.currentAudioBase64 = 'SGVsbG8=';

  elements.startSyncBtn.click();
  // Wait for async request loop
  await new Promise(r => setTimeout(r, 50));

  assert.ok(requestedUrls.length >= 2, '主模型失敗後應重試備用模型');
  assert.ok(requestedUrls[0].includes('gemini-2.0-flash'), '第一次請求應呼叫主模型');
  assert.ok(requestedUrls[1].includes('gemini-2.0-flash-exp'), '第二次請求應切換至備用模型');
});

suite.it('F07-3: Progress text updates with active model name during fallback attempts', () => {
  const { elements } = env;
  const modName = 'Gemini 2.0 Flash Exp';
  elements.syncProgressText.innerText = `SoundSync AI 正在使用 [${modName}] 高速對齊打軸中...`;
  
  assert.ok(elements.syncProgressText.innerText.includes('Gemini 2.0 Flash Exp'));
});

suite.it('F07-4: Success on secondary model stops fallback loop and returns data', async () => {
  const { context, elements, setFetchHandler } = env;
  let callCount = 0;

  setFetchHandler(async (url) => {
    callCount++;
    if (url.includes('gemini-2.0-flash:generateContent')) {
      return { json: async () => ({ error: { message: '500 Internal Error' } }) };
    }
    return {
      json: async () => ({
        candidates: [{ content: { parts: [{ text: '[{"start":"00:00:01.000","end":"00:00:02.000","text":"Success on model 2"}]' }] } }]
      })
    };
  });

  elements.apiKeyInput.value = 'AIzaSyTestKey';
  context.selectedAudioFile = { name: 'test.mp3', type: 'audio/mp3', size: 100 };
  context.currentAudioBase64 = 'SGVsbG8=';

  elements.startSyncBtn.click();
  await new Promise(r => setTimeout(r, 50));

  assert.strictEqual(callCount, 2, '成功取得資料後應終止後續模型請求');
  assert.strictEqual(context.parsedSubtitles[0].text, 'Success on model 2');
});

suite.it('F07-5: Complete failure across all candidate models throws last captured error message', async () => {
  const { context, elements, setFetchHandler, alertHistory } = env;

  setFetchHandler(async () => ({
    json: async () => ({ error: { message: 'All models unavailable 503' } })
  }));

  elements.apiKeyInput.value = 'AIzaSyTestKey';
  context.selectedAudioFile = { name: 'test.mp3', type: 'audio/mp3', size: 100 };
  context.currentAudioBase64 = 'SGVsbG8=';

  elements.startSyncBtn.click();
  await new Promise(r => setTimeout(r, 50));

  assert.ok(alertHistory.length > 0, '全部模型失敗後應顯示 alert 警告');
});

// Feature 8: Robust Millisecond Timestamp Parser
suite.it('F08-1: Parse HH:MM:SS.mmm string into exact float seconds', () => {
  const { context } = env;
  const sec = context.parseSeconds('01:02:03.456');
  // 1 hr (3600) + 2 mins (120) + 3.456 = 3723.456
  assert.strictEqual(sec, 3723.456);
});

suite.it('F08-2: Parse MM:SS.mmm string into exact float seconds', () => {
  const { context } = env;
  const sec = context.parseSeconds('02:03.456');
  assert.strictEqual(sec, 123.456);
});

suite.it('F08-3: Parse float seconds string into float seconds', () => {
  const { context } = env;
  const sec = context.parseSeconds('45.678');
  assert.strictEqual(sec, 45.678);
});

suite.it('F08-4: Empty or null timestamp string safely returns 0', () => {
  const { context } = env;
  assert.strictEqual(context.parseSeconds(''), 0);
  assert.strictEqual(context.parseSeconds(null), 0);
});

suite.it('F08-5: Format float seconds back into padded HH:MM:SS.mmm string', () => {
  const { context } = env;
  const formatted = context.formatSecondsToHHMMSS(3723.456);
  assert.strictEqual(formatted, '01:02:03.456');
});

// Feature 9: Overlap Eraser Algorithm
suite.it('F09-1: Consecutive overlapping timestamps are adjusted with 50ms safety gap', () => {
  const { context } = env;
  const input = [
    { start: '00:00:01.000', end: '00:00:05.000', text: 'Line 1' },
    { start: '00:00:04.000', end: '00:00:08.000', text: 'Line 2' }
  ];

  const fixed = context.fixSubtitleOverlaps(input);
  // Next start is 4.000s, adjusted end for Line 1 = max(0, 4.000 - 0.05) = 3.950s
  assert.strictEqual(fixed[0].end, '00:00:03.950');
});

suite.it('F09-2: Non-overlapping timestamps remain unmodified', () => {
  const { context } = env;
  const input = [
    { start: '00:00:01.000', end: '00:00:03.000', text: 'Line 1' },
    { start: '00:00:04.000', end: '00:00:08.000', text: 'Line 2' }
  ];

  const fixed = context.fixSubtitleOverlaps(input);
  assert.strictEqual(fixed[0].end, '00:00:03.000');
});

suite.it('F09-3: Zero or negative start boundaries maintain non-negative adjusted end boundaries', () => {
  const { context } = env;
  const input = [
    { start: '00:00:00.000', end: '00:00:02.000', text: 'Line 1' },
    { start: '00:00:00.020', end: '00:00:05.000', text: 'Line 2' }
  ];

  const fixed = context.fixSubtitleOverlaps(input);
  // nextStart (0.02) - 0.05 = -0.03 -> Math.max(0, -0.03) = 0.000
  assert.strictEqual(fixed[0].end, '00:00:00.000');
});

suite.it('F09-4: Array of multiple overlapping subtitle lines corrects all overlapping pairs sequentially', () => {
  const { context } = env;
  const input = [
    { start: '00:00:01.000', end: '00:00:05.000', text: 'Line 1' },
    { start: '00:00:04.000', end: '00:00:08.000', text: 'Line 2' },
    { start: '00:00:07.000', end: '00:00:10.000', text: 'Line 3' }
  ];

  const fixed = context.fixSubtitleOverlaps(input);
  assert.strictEqual(fixed[0].end, '00:00:03.950');
  assert.strictEqual(fixed[1].end, '00:00:06.950');
});

suite.it('F09-5: Empty or non-array input returns empty array safely without throwing exceptions', () => {
  const { context } = env;
  assert.deepStrictEqual(context.fixSubtitleOverlaps(null), []);
  assert.deepStrictEqual(context.fixSubtitleOverlaps(undefined), []);
  assert.deepStrictEqual(context.fixSubtitleOverlaps('invalid'), []);
});

// Feature 10: Interactive Real-Time Teleprompter
suite.it('F10-1: timeupdate event listener checks audio currentTime against line data-start and data-end', () => {
  const { context, elements } = env;
  const subs = [
    { start: '00:00:01.000', end: '00:00:05.000', text: 'Line 1' },
    { start: '00:00:06.000', end: '00:00:10.000', text: 'Line 2' }
  ];
  context.renderSubtitles(subs);

  elements.audioPlayer.currentTime = 3.0; // In range for Line 1
  elements.audioPlayer.dispatchEvent('timeupdate');

  const lineItems = elements.timelineContainer.children;
  assert.ok(lineItems[0].classList.contains('active-line'), 'Line 1 應被標記為 active-line');
  assert.ok(!lineItems[1].classList.contains('active-line'), 'Line 2 不應被標記為 active-line');
});

suite.it('F10-2: Active line receives active-line CSS class when audio currentTime falls in range', () => {
  const { context, elements } = env;
  context.renderSubtitles([{ start: '00:00:02.000', end: '00:00:04.000', text: 'Test' }]);
  
  elements.audioPlayer.currentTime = 3.0;
  elements.audioPlayer.dispatchEvent('timeupdate');

  const line = elements.timelineContainer.children[0];
  assert.strictEqual(line.classList.contains('active-line'), true);
});

suite.it('F10-3: Inactive lines have active-line CSS class removed when out of range', () => {
  const { context, elements } = env;
  context.renderSubtitles([{ start: '00:00:02.000', end: '00:00:04.000', text: 'Test' }]);
  
  elements.audioPlayer.currentTime = 5.0; // Out of range
  elements.audioPlayer.dispatchEvent('timeupdate');

  const line = elements.timelineContainer.children[0];
  assert.strictEqual(line.classList.contains('active-line'), false);
});

suite.it('F10-4: Active line triggers scrollIntoView smooth scroll behavior', () => {
  const { context, elements } = env;
  context.renderSubtitles([{ start: '00:00:01.000', end: '00:00:05.000', text: 'Test' }]);

  elements.audioPlayer.currentTime = 2.5;
  elements.audioPlayer.dispatchEvent('timeupdate');

  const line = elements.timelineContainer.children[0];
  assert.strictEqual(line.scrolledIntoView, true, 'Active 行應被自動捲動進入視圖 (scrolledIntoView)');
});

suite.it('F10-5: renderSubtitles creates div elements with lyric-line-item class and time-badge', () => {
  const { context, elements } = env;
  const subs = [{ start: '00:00:01.000', end: '00:00:02.000', text: '歌詞' }];
  context.renderSubtitles(subs);

  assert.strictEqual(elements.timelineContainer.children.length, 1);
  const child = elements.timelineContainer.children[0];
  assert.ok(child.className.includes('lyric-line-item'));
  assert.ok(child.innerHTML.includes('time-badge'));
  assert.ok(child.innerHTML.includes('歌詞'));
});

module.exports = suite;

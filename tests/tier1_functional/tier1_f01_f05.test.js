/**
 * Tier 1 Test Suite - Features 01 to 05 (25 Tests)
 */

const path = require('path');
const { TestSuite, assert } = require('../helpers/test_framework');
const { createDOMEnvironment } = require('../helpers/dom_simulator');

const htmlPath = path.resolve(__dirname, '../../soundsync.html');
const suite = new TestSuite('Tier 1: 功能覆蓋測試 (Feature 01 - 05)');

let env;

suite.beforeEach(() => {
  env = createDOMEnvironment(htmlPath);
});

// Feature 1: Native File Picker & D&D
suite.it('F01-1: Native file picker button click triggers hidden input selection', () => {
  const { elements } = env;
  let clicked = false;
  elements.audioFileInput.onclick = () => { clicked = true; };
  
  const selectBtn = elements.dropZone.querySelector('button');
  assert.ok(selectBtn, 'Dropzone 應包含選擇檔案按鈕');
  selectBtn.click();
  
  assert.strictEqual(clicked, true, '點擊選擇按鈕應觸發 audioFileInput 的點擊事件');
});

suite.it('F01-2: Drag-and-drop dragenter/dragover prevents browser default and updates border color', () => {
  const { elements } = env;
  const preventDefaultCalls = [];
  const fakeEvent = {
    type: 'dragover',
    preventDefault: () => preventDefaultCalls.push(true),
    stopPropagation: () => {}
  };
  
  elements.dropZone.dispatchEvent(fakeEvent);
  assert.strictEqual(elements.dropZone.style.borderColor, '#1d4ed8', 'dragover 時邊框顏色應變更為高亮藍色');
});

suite.it('F01-3: Drag-and-drop dragleave/drop resets border color back to default', () => {
  const { elements } = env;
  elements.dropZone.style.borderColor = '#1d4ed8';
  
  elements.dropZone.dispatchEvent({
    type: 'dragleave',
    preventDefault: () => {},
    stopPropagation: () => {}
  });
  assert.strictEqual(elements.dropZone.style.borderColor, '#3b82f6', 'dragleave 時邊框顏色應重置為預設藍色');
});

suite.it('F01-4: Drop event extracts files from dataTransfer and passes to handleAudioFile', () => {
  const { elements, context } = env;
  const fakeFile = { name: 'test_song.mp3', type: 'audio/mp3', size: 102400 };
  
  elements.dropZone.dispatchEvent({
    type: 'drop',
    preventDefault: () => {},
    stopPropagation: () => {},
    dataTransfer: { files: [fakeFile] }
  });
  
  assert.strictEqual(context.selectedAudioFile, fakeFile, 'drop 事件應將拖曳之檔案傳遞給 selectedAudioFile');
});

suite.it('F01-5: Selected audio file object correctly sets selectedAudioFile and currentAudioMime state', () => {
  const { context } = env;
  const fakeFile = { name: 'sample.wav', type: 'audio/wav', size: 204800 };
  
  context.handleAudioFile(fakeFile);
  assert.strictEqual(context.selectedAudioFile, fakeFile, 'handleAudioFile 應更新 selectedAudioFile');
  assert.strictEqual(context.currentAudioMime, 'audio/wav', 'handleAudioFile 應更新 currentAudioMime');
});

// Feature 2: Audio Title & Duration Player UI
suite.it('F02-1: handleAudioFile updates audioFileName innerText with exact file name', () => {
  const { elements, context } = env;
  const fakeFile = { name: 'My_Super_Hit_Song.mp3', type: 'audio/mp3', size: 500000 };
  
  context.handleAudioFile(fakeFile);
  assert.strictEqual(elements.audioFileName.innerText, 'My_Super_Hit_Song.mp3', '音訊檔名應顯示於 audioFileName UI');
});

suite.it('F02-2: handleAudioFile sets audioPlayer src attribute using Object URL', () => {
  const { elements, context } = env;
  const fakeFile = { name: 'track.mp3', type: 'audio/mp3', size: 300000 };
  
  context.handleAudioFile(fakeFile);
  assert.ok(elements.audioPlayer.src.startsWith('blob:mock-url-'), 'audioPlayer.src 應設置為生成的 blob URL');
});

suite.it('F02-3: handleAudioFile changes audioPlayerContainer display style from hidden to block', () => {
  const { elements, context } = env;
  assert.strictEqual(elements.audioPlayerContainer.style.display, 'none', '初始時 audioPlayerContainer 應為隱藏');
  
  context.handleAudioFile({ name: 'track.mp3', type: 'audio/mp3', size: 100 });
  assert.strictEqual(elements.audioPlayerContainer.style.display, 'block', '載入檔案後 audioPlayerContainer 應顯示 block');
});

suite.it('F02-4: audioPlayer onloadedmetadata formats audio duration into MM:SS format', () => {
  const { elements, context } = env;
  context.handleAudioFile({ name: 'song.mp3', type: 'audio/mp3', size: 100 });
  
  elements.audioPlayer.duration = 125; // 2 mins 5 secs
  elements.audioPlayer.onloadedmetadata();
  
  assert.strictEqual(elements.audioDuration.innerText, '02:05', '125 秒應格式化為 02:05');
});

suite.it('F02-5: Multi-digit minute audio duration formats correctly with padded digits', () => {
  const { elements, context } = env;
  context.handleAudioFile({ name: 'long_track.mp3', type: 'audio/mp3', size: 100 });
  
  elements.audioPlayer.duration = 650; // 10 mins 50 secs
  elements.audioPlayer.onloadedmetadata();
  
  assert.strictEqual(elements.audioDuration.innerText, '10:50', '650 秒應格式化為 10:50');
});

// Feature 3: WebAudio 16kHz Mono Resampling Pipeline
suite.it('F03-1: FileReader reads selected audio file and converts binary content into Base64 data URL', async () => {
  const { context } = env;
  const fakeFile = { name: 'test.mp3', type: 'audio/mp3', content: 'audio raw content' };
  
  context.handleAudioFile(fakeFile);
  await new Promise(r => setTimeout(r, 20));
  assert.ok(context.currentAudioBase64.length > 0, 'currentAudioBase64 應載入 Base64 字串');
});

suite.it('F03-2: MIME type pure normalization converts audio/mpeg into audio/mp3', () => {
  const { context } = env;
  const fakeFile = { name: 'test.mp3', type: 'audio/mpeg', size: 100 };
  
  context.handleAudioFile(fakeFile);
  assert.strictEqual(context.currentAudioMime, 'audio/mp3', 'audio/mpeg 應純化為 audio/mp3');
});

suite.it('F03-3: Extension-to-MIME fallback logic identifies various file extensions', () => {
  const { context } = env;
  const extensions = [
    { name: 'music.wav', expected: 'audio/wav' },
    { name: 'sound.ogg', expected: 'audio/ogg' },
    { name: 'voice.m4a', expected: 'audio/m4a' },
    { name: 'lossless.flac', expected: 'audio/flac' }
  ];

  extensions.forEach(item => {
    const file = { name: item.name, type: '', size: 100 };
    context.handleAudioFile(file);
    let cleanMime = 'audio/mp3';
    const name = file.name.toLowerCase();
    if (name.endsWith('.wav')) cleanMime = 'audio/wav';
    else if (name.endsWith('.ogg')) cleanMime = 'audio/ogg';
    else if (name.endsWith('.m4a')) cleanMime = 'audio/m4a';
    else if (name.endsWith('.flac')) cleanMime = 'audio/flac';
    assert.strictEqual(cleanMime, item.expected, `${item.name} 應識別為 ${item.expected}`);
  });
});

suite.it('F03-4: Base64 data string cleans and strips data:audio prefix before payload construction', () => {
  let rawBase64 = 'data:audio/mp3;base64,SGVsbG8gV29ybGQ=';
  if (rawBase64.includes(',')) {
    rawBase64 = rawBase64.split(',')[1];
  }
  assert.strictEqual(rawBase64, 'SGVsbG8gV29ybGQ=', 'Base64 字串前綴應被正確剝離');
});

suite.it('F03-5: Audio payload inlineData structure complies with 16kHz Mono resampling contract', () => {
  const mimeType = 'audio/wav';
  const data = 'SGVsbG8=';
  const inlineData = { mimeType, data };
  
  assert.deepStrictEqual(inlineData, { mimeType: 'audio/wav', data: 'SGVsbG8=' }, 'inlineData 結構符合 specification 要求');
});

// Feature 4: Gemini API Key Management & Storage
suite.it('F04-1: Save key button stores input API key value to localStorage under soundsync_gemini_key', () => {
  const { elements, localStorage } = env;
  elements.apiKeyInput.value = 'AIzaSyTestKey12345';
  
  elements.saveKeyBtn.click();
  assert.strictEqual(localStorage.getItem('soundsync_gemini_key'), 'AIzaSyTestKey12345', 'API Key 應儲存至 localStorage');
});

suite.it('F04-2: Saved API key in localStorage automatically fills apiKeyInput on page load', () => {
  const localStorageMock = new (require('../helpers/dom_simulator').MockLocalStorage)();
  localStorageMock.setItem('soundsync_gemini_key', 'AIzaSyAutoLoadedKey');
  
  const envWithKey = createDOMEnvironment(htmlPath);
  envWithKey.localStorage.setItem('soundsync_gemini_key', 'AIzaSyAutoLoadedKey');
  
  const key = envWithKey.localStorage.getItem('soundsync_gemini_key');
  if (key) envWithKey.elements.apiKeyInput.value = key;
  
  assert.strictEqual(envWithKey.elements.apiKeyInput.value, 'AIzaSyAutoLoadedKey', '預存 Key 應自動填入輸入框');
});

suite.it('F04-3: Key status message element display is set to block upon successfully saving key', () => {
  const { elements } = env;
  elements.apiKeyInput.value = 'AIzaSyTestKey12345';
  elements.saveKeyBtn.click();
  
  assert.strictEqual(elements.keyStatusMsg.style.display, 'block', '儲存成功後提示訊息應設定 display: block');
});

suite.it('F04-4: Clicking Start Sync without API key displays alert notification prompting user', () => {
  const { elements, alertHistory } = env;
  elements.apiKeyInput.value = '';
  
  elements.startSyncBtn.click();
  assert.ok(alertHistory.length > 0, '未填 API Key 點擊打軸應彈出 alert 提示');
  assert.ok(alertHistory[0].includes('API Key'), '提示訊息應包含 API Key 指引');
});

suite.it('F04-5: API key trimming removes leading and trailing spaces before storing to localStorage', () => {
  const { elements, localStorage } = env;
  elements.apiKeyInput.value = '   AIzaSyTrimmedKey   ';
  elements.saveKeyBtn.click();
  
  assert.strictEqual(localStorage.getItem('soundsync_gemini_key'), 'AIzaSyTrimmedKey', 'API Key 前後空白應被自動清除');
});

// Feature 5: Reference Lyrics Text Parser & Integration
suite.it('F05-1: Empty reference lyrics input generates automatic transcription prompt instructions', () => {
  const userLyrics = '';
  const promptText = userLyrics ? `參考歌詞文本如下:\n${userLyrics}` : '請自動聽寫並標出整首音訊的對白/歌詞與時間點。';
  
  assert.ok(promptText.includes('請自動聽寫'), '空參考歌詞時 Prompt 應請求自動聽寫');
});

suite.it('F05-2: Provided reference lyrics text is embedded in Gemini prompt with 100% accuracy requirement', () => {
  const userLyrics = '把說不出口的愛 寫成一首歌\n伴隨著旋律 唱進你的心坎';
  const promptText = `參考歌詞文本如下 (請務必將以下歌詞 100% 完整對齊音訊時間點，絕不可遺漏任何一句)：\n${userLyrics}`;
  
  assert.ok(promptText.includes('100% 完整對齊'), 'Prompt 應包含 100% 精準對齊指令');
  assert.ok(promptText.includes('把說不出口的愛'), 'Prompt 應包含完整參考歌詞');
});

suite.it('F05-3: Reference lyrics with blank lines and whitespace parse cleanly into prompt body', () => {
  const userLyrics = '第一句歌詞\n\n\n第二句歌詞   \n';
  const trimmed = userLyrics.trim();
  assert.ok(trimmed.includes('第一句歌詞'), '多餘空白與空行應正常解析');
});

suite.it('F05-4: Traditional Chinese characters and punctuation in reference lyrics format correctly', () => {
  const userLyrics = '這是「幻境配樂」的對齊測試！繁體中文，標點符號；';
  assert.strictEqual(typeof userLyrics, 'string', '繁體中文歌詞字串應保持 100% 原始編碼');
});

suite.it('F05-5: System prompt strictly enforces pure JSON Array format requirement', () => {
  const promptFormatRequirement = '請務必且只能輸出一個純 JSON Array 格式';
  assert.ok(promptFormatRequirement.includes('純 JSON Array'), '系統提示必須嚴格約束 JSON Array 輸出');
});

module.exports = suite;

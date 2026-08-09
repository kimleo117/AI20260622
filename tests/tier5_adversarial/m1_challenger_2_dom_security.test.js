/**
 * Tier 5 Test Suite - Frontend File Selection, Memory Leak & DOM Security Adversarial Harness
 * 撰寫對抗性測試驗證前端選檔與播放器 DOM 安全
 */

const path = require('path');
const { TestSuite, assert } = require('../helpers/test_framework');
const { createDOMEnvironment } = require('../helpers/dom_simulator');

const htmlPath = path.resolve(__dirname, '../../soundsync.html');
const suite = new TestSuite('Tier 5: 對抗性與 DOM 安全測試 (Adversarial DOM Security & Memory Harness)');

let env;

suite.beforeEach(() => {
  env = createDOMEnvironment(htmlPath);
});

// Category 1: Windows Filename Format & Symbol Handling
suite.it('TC-ADV-01: Windows 特殊字元與符號檔名 (測試(Live)#1.mp3, track & song #1!.mp3) 正常渲染與屬性設定', () => {
  const { context, elements } = env;
  const filenames = [
    '測試(Live)#1.mp3',
    'track & song (2026) [remix] #1!.mp3',
    'special%20#hash?query&param.wav',
    'file;cmd_test.flac',
    '音樂作品 (2026年最新版) [Live].m4a'
  ];

  for (const fname of filenames) {
    const file = { name: fname, type: 'audio/mp3', size: 1024 };
    context.handleAudioFile(file);
    assert.strictEqual(elements.audioFileName.innerText, fname, `檔名 [${fname}] 應完整顯示於 audioFileName`);
    assert.strictEqual(elements.audioFileName.getAttribute('title'), fname, `檔名 [${fname}] 的 title 屬性應維持一致`);
  }
});

// Category 2: Non-Audio File Drag-and-Drop & MIME Filtering
suite.it('TC-ADV-02: 拖曳非音訊檔 (PDF, TXT, DOCX) 並帶有標準 MIME 類型時觸發格式錯誤攔截', () => {
  const { context, alertHistory } = env;
  const nonAudioFiles = [
    { name: 'contract.pdf', type: 'application/pdf', size: 5000 },
    { name: 'notes.txt', type: 'text/plain', size: 1000 },
    { name: 'document.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 12000 }
  ];

  for (const file of nonAudioFiles) {
    alertHistory.length = 0;
    context.handleAudioFile(file);
    assert.ok(alertHistory.length > 0, `非音訊檔 [${file.name}] 應觸發警告彈窗`);
    assert.ok(alertHistory[0].includes('不支援的檔案格式'), `彈窗應包含「不支援的檔案格式」警告訊息`);
  }
});

suite.it('TC-ADV-03: 漏洞驗證 - 拖曳非音訊檔 (PDF, TXT) 但系統給予空白 MIME 類型 (file.type = "") 時之驗證邏輯測試', () => {
  const { context, alertHistory } = env;
  // 在某些 Windows 環境拖曳無關聯 MIME 檔案時，file.type 可能為 ""
  const emptyMimePdf = { name: 'sample_document.pdf', type: '', size: 5000 };
  
  alertHistory.length = 0;
  context.handleAudioFile(emptyMimePdf);
  
  // 檢查是否被視為 valid，若被誤判為 valid 則說明 validateAudioFile 存在 MIME 漏洞
  const isValidated = alertHistory.length === 0;
  if (isValidated) {
    console.warn('⚠️ 發現漏洞 [BUG-ADV-01]: validateAudioFile 在 file.type 為空字串時會誤判 .pdf 檔為有效音訊檔案！');
  }
  // 這裡斷言：針對非音訊副檔名，即使 file.type 為空，仍應被阻擋或回報漏洞狀況
  assert.ok(!isValidated, 'validateAudioFile 應能夠阻擋副檔名為 .pdf 且 MIME 為空的非音訊檔案');
});

suite.it('TC-ADV-04: 0 位元組空檔案 (size: 0) 上傳應觸發 ZERO_BYTE 錯誤提示', () => {
  const { context, alertHistory } = env;
  const zeroByteFile = { name: 'corrupted_audio.mp3', type: 'audio/mp3', size: 0 };
  
  alertHistory.length = 0;
  context.handleAudioFile(zeroByteFile);
  assert.ok(alertHistory.length > 0, '0 位元組檔案應跳出提示');
  assert.ok(alertHistory[0].includes('容量為 0 位元組'), '提示應告知 0 位元組檔案損毀');
});

// Category 3: Memory Release Verification on Sequential File Switch
suite.it('TC-ADV-05: 連續 100 次替換音訊檔之 URL 記憶體釋放狀況 (revokeObjectURL 呼叫次數驗證)', () => {
  const { context } = env;
  let revokeCount = 0;
  const revokedUrls = [];

  // Mock URL.revokeObjectURL
  context.URL.revokeObjectURL = (url) => {
    revokeCount++;
    revokedUrls.push(url);
  };

  const fileCount = 100;
  for (let i = 0; i < fileCount; i++) {
    const file = { name: `track_${i}.mp3`, type: 'audio/mp3', size: 1000 + i };
    context.handleAudioFile(file);
  }

  // 第一次載入不釋放 (activeObjectUrl 為 null)，後續 99 次載入應每次釋放前一個 URL
  assert.strictEqual(revokeCount, fileCount - 1, `100 次連續替換音訊應呼叫 revokeObjectURL ${fileCount - 1} 次`);
});

// Category 4: XSS & DOM Injection Security Tests
suite.it('TC-ADV-06: 漏洞驗證 - 字幕文本包含 Script 標籤 XSS (<script>alert("xss")</script>) DOM 注入測試', () => {
  const { context, elements } = env;
  const maliciousSubtitles = [
    { start: '00:00:01.000', end: '00:00:03.000', text: '正常歌詞第一句' },
    { start: '00:00:03.000', end: '00:00:06.000', text: '<script>window.xssExecuted=true;</script>' }
  ];

  context.renderSubtitles(maliciousSubtitles);
  const renderedItems = elements.timelineContainer.children;
  assert.strictEqual(renderedItems.length, 2);

  const xssItemHtml = renderedItems[1].innerHTML;
  // 檢查 innerHTML 是否直接包含未經 HTML Entity 轉義的原始 <script> 標籤
  const isUnescapedScript = xssItemHtml.includes('<script>');
  if (isUnescapedScript) {
    console.warn('⚠️ 發現嚴重 XSS 漏洞 [BUG-ADV-02]: renderSubtitles 使用 innerHTML 且未對字幕內容進行 HTML 轉義，導致 <script> 標籤可被注入！');
  }
  assert.ok(!isUnescapedScript, '字幕文本中的 <script> 標籤必須經由 HTML Entity 轉義 (&lt;script&gt;) 或使用 textContent');
});

suite.it('TC-ADV-07: 漏洞驗證 - 字幕文本包含 Event Handler 屬性 XSS (<img src=x onerror=alert(1)>) 注入測試', () => {
  const { context, elements } = env;
  const imgXssSubtitles = [
    { start: '00:00:01.000', end: '00:00:04.000', text: '<img src="invalid.jpg" onerror="alert(\'XSS\')">' }
  ];

  context.renderSubtitles(imgXssSubtitles);
  const xssItemHtml = elements.timelineContainer.children[0].innerHTML;
  const isUnescapedImg = xssItemHtml.includes('<img') || xssItemHtml.includes('onerror=');
  if (isUnescapedImg) {
    console.warn('⚠️ 發現嚴重 XSS 漏洞 [BUG-ADV-03]: renderSubtitles 允許 <img onerror=...> 屬性直接寫入 DOM！');
  }
  assert.ok(!isUnescapedImg, '字幕文本中的 <img onerror=...> 必須經過轉義以防 DOM XSS 觸發');
});

suite.it('TC-ADV-08: 漏洞驗證 - 字幕文本包含 SVG 載入型 XSS (<svg/onload=alert(1)>) 注入測試', () => {
  const { context, elements } = env;
  const svgXssSubtitles = [
    { start: '00:00:01.000', end: '00:00:04.000', text: '<svg/onload=alert(document.cookie)>' }
  ];

  context.renderSubtitles(svgXssSubtitles);
  const xssItemHtml = elements.timelineContainer.children[0].innerHTML;
  const isUnescapedSvg = xssItemHtml.includes('<svg') || xssItemHtml.includes('onload=');
  assert.ok(!isUnescapedSvg, '字幕文本中的 <svg/onload=...> 必須經過轉義');
});

suite.it('TC-ADV-09: 漏洞驗證 - DOM 亂碼/標籤吞噬測試 (歌詞包含 HTML 尖號如 Lyrics <Verse 1> & chorus)', () => {
  const { context, elements } = env;
  const bracketSubtitles = [
    { start: '00:00:01.000', end: '00:00:04.000', text: 'Lyrics <Verse 1> & Chorus <Outro>' }
  ];

  context.renderSubtitles(bracketSubtitles);
  const itemHtml = elements.timelineContainer.children[0].innerHTML;
  
  // 若使用 innerHTML 未轉義，`<Verse 1>` 會被瀏覽器 DOM 解析為無效 HTML 標籤而吞噬，導致文字顯示亂碼或丟失
  const isSwallowed = !itemHtml.includes('&lt;Verse 1&gt;') && !itemHtml.includes('<Verse 1>');
  if (!itemHtml.includes('&lt;Verse 1&gt;')) {
    console.warn('⚠️ 發現 DOM 渲染瑕疵 [BUG-ADV-04]: 歌詞中的 <Verse 1> 未轉義，會被 DOM 解析為 HTML 標籤而造成顯示異常！');
  }
  assert.ok(itemHtml.includes('&lt;Verse 1&gt;') || itemHtml.includes('&amp;'), '歌詞中的尖括號與 & 符號應被轉義為 HTML Entities');
});

suite.it('TC-ADV-10: 漏洞驗證 - 字幕時間戳記欄位 XSS 注入 (start="00:00:01\"<img src=x onerror=alert(1)>")', () => {
  const { context, elements } = env;
  const timestampXssSubtitles = [
    { start: '00:00:01"<img src=x onerror=alert(1)>', end: '00:00:05', text: '時間戳記 XSS 測試' }
  ];

  context.renderSubtitles(timestampXssSubtitles);
  const itemHtml = elements.timelineContainer.children[0].innerHTML;
  const isUnescapedTimestamp = itemHtml.includes('<img');
  assert.ok(!isUnescapedTimestamp, '時間戳記欄位中的 HTML 標籤必須經過轉義');
});

module.exports = suite;

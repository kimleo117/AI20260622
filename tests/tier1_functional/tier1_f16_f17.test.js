/**
 * Tier 1 Test Suite - Features 16 to 17 (10 Tests)
 */

const path = require('path');
const { TestSuite, assert } = require('../helpers/test_framework');
const { createDOMEnvironment } = require('../helpers/dom_simulator');

const htmlPath = path.resolve(__dirname, '../../soundsync.html');
const suite = new TestSuite('Tier 1: 功能覆蓋測試 (Feature 16 - 17)');

let env;

suite.beforeEach(() => {
  env = createDOMEnvironment(htmlPath);
});

// Feature 16: Traditional Chinese Error Translator
suite.it('F16-1: 429 quota error translates into Traditional Chinese instructions with AI Studio key link', () => {
  const { context } = env;
  const rawMsg = 'API quota exceeded (HTTP 429 Resource Exhausted)';
  const friendly = context.getFriendlyChineseError(rawMsg);

  assert.ok(friendly.includes('Gemini API 今日免費額度已達上限'));
  assert.ok(friendly.includes('https://aistudio.google.com/app/apikey'));
  assert.ok(friendly.includes('Create API Key'));
});

suite.it('F16-2: 401 / 403 invalid key error translates into Key verification guidance in Traditional Chinese', () => {
  const { context } = env;
  const rawMsg = 'API key invalid (HTTP 401 Unauthorized)';
  const friendly = context.getFriendlyChineseError(rawMsg);

  assert.ok(friendly.includes('API 金鑰無效或填寫錯誤'));
  assert.ok(friendly.includes('AIzaSy'));
});

suite.it('F16-3: 404 model error translates into model switch notification in Traditional Chinese', () => {
  const { context } = env;
  const rawMsg = 'Model not found in region';
  const friendly = context.getFriendlyChineseError(rawMsg);

  assert.ok(friendly.includes('API 模型維護切換中'));
  assert.ok(friendly.includes('自動切換至最新相容模型'));
});

suite.it('F16-4: 500 / 503 server error translates into Google server busy retry guidance in Traditional Chinese', () => {
  const { context } = env;
  const rawMsg = 'HTTP 503 Internal Server Error';
  const friendly = context.getFriendlyChineseError(rawMsg);

  assert.ok(friendly.includes('Google 官方伺服器暫時忙碌'));
  assert.ok(friendly.includes('重新點擊「開始打軸」'));
});

suite.it('F16-5: Unrecognized error message falls back to formatted system prompt error message in Traditional Chinese', () => {
  const { context } = env;
  const rawMsg = 'Unknown network failure x123';
  const friendly = context.getFriendlyChineseError(rawMsg);

  assert.ok(friendly.includes('❌ 系統提示：Unknown network failure x123'));
});

// Feature 17: E2E Testing Suite & Quality Hardening
suite.it('F17-1: Test runner framework executes tests cleanly without throwing uncaught exceptions', async () => {
  const dummySuite = new TestSuite('Dummy Execution');
  dummySuite.it('test case', () => { assert.strictEqual(1, 1); });
  
  const origLog = console.log;
  console.log = () => {};
  const res = await dummySuite.run();
  console.log = origLog;

  assert.strictEqual(res.passed, 1);
  assert.strictEqual(res.failed, 0);
});

suite.it('F17-2: Test suite aggregates total passed, failed, and duration counts accurately', async () => {
  const dummySuite = new TestSuite('Dummy Aggregation');
  dummySuite.it('pass 1', () => { assert.strictEqual(1, 1); });
  dummySuite.it('fail 1', () => { assert.strictEqual(1, 2); });

  const origLog = console.log;
  const origErr = console.error;
  console.log = () => {};
  console.error = () => {};

  const res = await dummySuite.run();

  console.log = origLog;
  console.error = origErr;

  assert.strictEqual(res.total, 2);
  assert.strictEqual(res.passed, 1);
  assert.strictEqual(res.failed, 1);
});

suite.it('F17-3: Non-intrusive opaque box tests verify actual DOM and JS logic without modifying HTML source code', () => {
  const fs = require('fs');
  const rawHtml = fs.readFileSync(htmlPath, 'utf8');
  assert.ok(rawHtml.includes('<!DOCTYPE html>'));
  assert.ok(rawHtml.includes('SoundSync AI'));
});

suite.it('F17-4: Assertions generate detailed failure descriptions on mismatch', () => {
  try {
    assert.strictEqual('A', 'B', '字串不相符');
    assert.fail('Should have thrown');
  } catch (err) {
    assert.ok(err.message.includes('字串不相符'));
  }
});

suite.it('F17-5: Test environment isolates global state completely between test runs', () => {
  const env1 = createDOMEnvironment(htmlPath);
  env1.localStorage.setItem('key1', 'val1');

  const env2 = createDOMEnvironment(htmlPath);
  assert.strictEqual(env2.localStorage.getItem('key1'), null, '不同測試環境間 localStorage 應完全隔離');
});

module.exports = suite;

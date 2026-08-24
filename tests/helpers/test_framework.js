/**
 * SoundSync AI - Lightweight Test Suite Framework
 */

const assert = require('assert');

class TestSuite {
  constructor(name) {
    this.name = name;
    this.tests = [];
    this.beforeEachFns = [];
    this.afterEachFns = [];
  }

  beforeEach(fn) {
    this.beforeEachFns.push(fn);
  }

  afterEach(fn) {
    this.afterEachFns.push(fn);
  }

  test(description, fn) {
    this.tests.push({ description, fn });
  }

  it(description, fn) {
    this.test(description, fn);
  }

  async run() {
    const results = {
      suiteName: this.name,
      total: this.tests.length,
      passed: 0,
      failed: 0,
      details: []
    };

    console.log(`\n========================================`);
    console.log(`🏃 執行測試套件: [${this.name}]`);
    console.log(`========================================`);

    for (const testCase of this.tests) {
      const startTime = Date.now();
      try {
        for (const be of this.beforeEachFns) {
          await be();
        }
        await testCase.fn();
        for (const ae of this.afterEachFns) {
          await ae();
        }
        const duration = Date.now() - startTime;
        results.passed++;
        results.details.push({
          name: testCase.description,
          passed: true,
          duration
        });
        console.log(`  ✅ [PASS] ${testCase.description} (${duration}ms)`);
      } catch (err) {
        const duration = Date.now() - startTime;
        results.failed++;
        results.details.push({
          name: testCase.description,
          passed: false,
          error: err.message,
          stack: err.stack,
          duration
        });
        console.error(`  ❌ [FAIL] ${testCase.description} (${duration}ms)`);
        console.error(`     錯誤資訊: ${err.message}`);
      }
    }

    return results;
  }
}

module.exports = {
  TestSuite,
  assert
};

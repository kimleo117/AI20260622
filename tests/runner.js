/**
 * SoundSync AI - Central Test Runner
 * Executes Tier 1, Tier 2, Tier 3, and Tier 4 E2E Test Suites.
 */

const path = require('path');

const tier1_f01_f05 = require('./tier1_functional/tier1_f01_f05.test');
const tier1_f06_f10 = require('./tier1_functional/tier1_f06_f10.test');
const tier1_f11_f15 = require('./tier1_functional/tier1_f11_f15.test');
const tier1_f16_f17 = require('./tier1_functional/tier1_f16_f17.test');
const tier2_boundaries = require('./tier2_boundary/tier2_boundaries.test');
const tier3_combination = require('./tier3_combination/tier3_combination.test');
const tier4_real_world = require('./tier4_real_world/tier4_real_world.test');

async function main() {
  console.log(`=======================================================`);
  console.log(`🚀 SoundSync AI 獨立 E2E 自動化測試套件啟動`);
  console.log(`=======================================================\n`);

  const suites = [
    tier1_f01_f05,
    tier1_f06_f10,
    tier1_f11_f15,
    tier1_f16_f17,
    tier2_boundaries,
    tier3_combination,
    tier4_real_world
  ];

  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  const suiteSummaries = [];

  for (const suite of suites) {
    const res = await suite.run();
    totalTests += res.total;
    totalPassed += res.passed;
    totalFailed += res.failed;
    suiteSummaries.push({
      name: res.suiteName,
      total: res.total,
      passed: res.passed,
      failed: res.failed
    });
  }

  console.log(`\n=======================================================`);
  console.log(`📊 SoundSync AI E2E 測試執行結果總計 Summary`);
  console.log(`=======================================================`);
  suiteSummaries.forEach(s => {
    const status = s.failed === 0 ? '✅ PASS' : '❌ FAIL';
    console.log(` ${status} | ${s.name.padEnd(45, ' ')} | 通過: ${s.passed}/${s.total}`);
  });

  console.log(`-------------------------------------------------------`);
  console.log(`總測試項目 (Total Tests): ${totalTests}`);
  console.log(`成功通過 (Total Passed): ${totalPassed}`);
  console.log(`失敗項目 (Total Failed): ${totalFailed}`);
  console.log(`測試覆蓋率 (Pass Rate)  : ${((totalPassed / totalTests) * 100).toFixed(2)}%`);
  console.log(`=======================================================\n`);

  if (totalFailed > 0) {
    console.error(`❌ 測試套件執行失敗！有 ${totalFailed} 個測試案例未通過。`);
    process.exit(1);
  } else {
    console.log(`🎉 恭喜！所有 Tier 1 - Tier 4 E2E 測試項目全數通過！ (100% PASS)`);
    process.exit(0);
  }
}

main().catch(err => {
  console.error('測試執行發生未預期錯誤:', err);
  process.exit(1);
});

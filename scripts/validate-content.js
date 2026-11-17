'use strict';

const path = require('node:path');
const {
  CONTENT_DIR,
  loadManifest,
  loadPacks,
  readJson,
  validatePack,
  validateContent
} = require('./content-lib');

function printResult(label, result) {
  console.log(`\n${label}`);
  console.log(`  题目 ${result.stats.questions} · 知识卡 ${result.stats.cards} · 代码题 ${result.stats.codeQuestions}`);
  console.log(
    `  难度 基础 ${result.stats.difficulty['基础']} / 进阶 ${result.stats.difficulty['进阶']} / 挑战 ${result.stats.difficulty['挑战']}`
  );
  if (result.warnings.length) {
    console.log('\n警告：');
    for (const warning of result.warnings) console.log(`  - ${warning}`);
  }
  if (result.errors.length) {
    console.error('\n错误：');
    for (const error of result.errors) console.error(`  - ${error}`);
  }
}

const args = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));

if (args.length > 0) {
  let failed = false;
  for (const file of args) {
    const fullPath = path.isAbsolute(file) ? file : path.resolve(process.cwd(), file);
    const expectedId = path.basename(fullPath, '.json');
    try {
      const pack = readJson(fullPath);
      const result = validatePack(pack, { expectedId });
      printResult(`${pack.title || expectedId} (${path.basename(file)})`, result);
      if (result.errors.length) failed = true;
    } catch (error) {
      console.error(`无法读取 ${file}: ${error.message}`);
      failed = true;
    }
  }
  process.exitCode = failed ? 1 : 0;
} else {
  try {
    const manifest = loadManifest();
    const packs = loadPacks(manifest);
    const result = validateContent(packs.map((item) => item.pack), manifest);
    printResult(`题库 v${manifest.contentVersion}（${packs.length} 个主题）`, result);
    process.exitCode = result.errors.length ? 1 : 0;
  } catch (error) {
    console.error(`校验失败: ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.exitCode === 0) {
  console.log('\n✓ 校验通过');
} else {
  console.error(`\n内容目录: ${CONTENT_DIR}`);
}

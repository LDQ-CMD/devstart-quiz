'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  BUNDLE_PATH,
  DATA_PATH,
  buildBundle,
  generatedIsCurrent,
  loadManifest,
  loadPacks,
  validateContent,
  writeGenerated
} = require('./content-lib');

const checkOnly = process.argv.includes('--check');

try {
  const manifest = loadManifest();
  const packs = loadPacks(manifest);
  const validation = validateContent(packs.map((item) => item.pack), manifest);

  for (const warning of validation.warnings) console.warn(`警告: ${warning}`);
  if (validation.errors.length) {
    console.error(`题库校验未通过（${validation.errors.length} 个错误）：`);
    for (const error of validation.errors) console.error(`  - ${error}`);
    process.exitCode = 1;
  } else {
    const bundle = buildBundle(packs, manifest);

    if (checkOnly) {
      const status = generatedIsCurrent(bundle);
      if (status.bundleOk && status.dataOk) {
        console.log(`✓ 生成文件与内容包一致（v${bundle.contentVersion}）`);
      } else {
        console.error('✗ 生成文件已过期，请运行 node scripts/build-content.js');
        if (!status.bundleOk) console.error(`  - ${path.relative(process.cwd(), BUNDLE_PATH)}`);
        if (!status.dataOk) console.error(`  - ${path.relative(process.cwd(), DATA_PATH)}`);
        process.exitCode = 1;
      }
    } else {
      writeGenerated(bundle);
      console.log(`✓ 已生成题库 v${bundle.contentVersion}`);
      console.log(`  - ${path.relative(process.cwd(), BUNDLE_PATH)}`);
      console.log(`  - ${path.relative(process.cwd(), DATA_PATH)}`);
      console.log(
        `  ${bundle.topics.length} 个主题 · ${bundle.topics.reduce((sum, topic) => sum + topic.questions.length, 0)} 道题`
      );
      if (!fs.existsSync(DATA_PATH)) console.error('✗ data.js 未生成');
    }
  }
} catch (error) {
  console.error(`构建失败: ${error.message}`);
  process.exitCode = 1;
}

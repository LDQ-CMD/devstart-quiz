'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const lib = require(path.join(__dirname, '..', 'scripts', 'content-lib.js'));

const expectedTopics = [
  'python',
  'docker',
  'k8s',
  'linux',
  'git',
  'network',
  'sql',
  'data-structures'
];

const manifest = lib.loadManifest();
const loaded = lib.loadPacks(manifest);
const packs = loaded.map((item) => item.pack);
const validation = lib.validateContent(packs, manifest);

test('题库内容通过全部校验', () => {
  assert.deepEqual(validation.errors, []);
  assert.deepEqual(validation.warnings, []);
});

test('manifest 定义 8 个主题与版本信息', () => {
  assert.equal(manifest.schemaVersion, 2);
  assert.match(manifest.contentVersion, /^\d+\.\d+\.\d+$/);
  assert.match(manifest.releasedAt, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(manifest.packs.length, 8);
  assert.deepEqual(packs.map((pack) => pack.id), expectedTopics);
  assert.ok(manifest.notes.length >= 3);
});

test('共 8 个主题、32 张知识卡、120 道题', () => {
  assert.equal(packs.length, 8);
  assert.equal(validation.stats.cards, 32);
  assert.equal(validation.stats.questions, 120);
  for (const pack of packs) {
    assert.equal(pack.cards.length, 4, `${pack.id} 应有 4 张知识卡`);
    assert.equal(pack.questions.length, 15, `${pack.id} 应有 15 道题`);
    assert.ok(pack.objectives.length >= 3 && pack.objectives.length <= 5);
    assert.ok(pack.estimatedMinutes >= 30);
  }
});

test('每个主题的难度分布达到深度要求', () => {
  for (const pack of packs) {
    const counts = { 基础: 0, 进阶: 0, 挑战: 0 };
    for (const question of pack.questions) counts[question.difficulty] += 1;
    assert.ok(counts['基础'] >= 6, `${pack.id} 基础题不足`);
    assert.ok(counts['进阶'] >= 4, `${pack.id} 进阶题不足`);
    assert.ok(counts['挑战'] >= 2, `${pack.id} 挑战题不足`);
  }
  assert.equal(validation.stats.difficulty['基础'] + validation.stats.difficulty['进阶'] + validation.stats.difficulty['挑战'], 120);
});

test('每道题都有 4 条逐选项解析', () => {
  for (const pack of packs) {
    for (const question of pack.questions) {
      assert.equal(question.optionNotes.length, 4, `${question.id} optionNotes 数量错误`);
      for (const note of question.optionNotes) {
        assert.ok(note.trim().length >= 6, `${question.id} optionNotes 过短`);
      }
      assert.ok(question.explanation.trim().length >= 20, `${question.id} 解析过短`);
      assert.ok(question.tags.length >= 1 && question.tags.length <= 3);
    }
  }
});

test('每道题的正确选项分布合格且无连续四题相同', () => {
  for (const pack of packs) {
    const counts = [0, 0, 0, 0];
    let run = 1;
    pack.questions.forEach((question, index) => {
      counts[question.answerIndex] += 1;
      if (index > 0) {
        run = question.answerIndex === pack.questions[index - 1].answerIndex ? run + 1 : 1;
        assert.ok(run < 4, `${pack.id} 连续 4 题答案相同`);
      }
    });
    assert.ok(counts.every((count) => count >= 2), `${pack.id} 答案位置分布不均: ${counts.join('/')}`);
  }
});

test('代码/命令阅读题达到深度要求', () => {
  assert.ok(validation.stats.codeQuestions >= 20, `代码题只有 ${validation.stats.codeQuestions} 道`);
  for (const pack of packs) {
    const codeCount = pack.questions.filter((question) => question.code && question.code.content).length;
    assert.ok(codeCount >= 2, `${pack.id} 代码/命令题不足（${codeCount}）`);
  }
});

test('知识卡包含要点、坑点与示例', () => {
  for (const pack of packs) {
    for (const card of pack.cards) {
      assert.ok(card.points.length >= 4 && card.points.length <= 6);
      assert.ok(card.pitfalls.length >= 2 && card.pitfalls.length <= 3);
    }
    const examples = pack.cards.filter((card) => card.example && card.example.code).length;
    assert.ok(examples >= 2, `${pack.id} 带示例的知识卡不足`);
  }
});

test('题目 ID、题干全局唯一', () => {
  const ids = new Set();
  const stems = new Set();
  for (const pack of packs) {
    for (const question of pack.questions) {
      assert.match(question.id, new RegExp(`^${pack.id}-\\d{3}$`));
      assert.ok(!ids.has(question.id), `题目 ID 重复: ${question.id}`);
      ids.add(question.id);
      const stem = question.question.trim();
      assert.ok(!stems.has(stem), `题干重复: ${stem.slice(0, 30)}`);
      stems.add(stem);
    }
  }
});

test('生成物与内容包一致', () => {
  const bundle = lib.buildBundle(loaded, manifest);
  const status = lib.generatedIsCurrent(bundle);
  assert.ok(status.bundleOk, 'demo/content/bundle.json 已过期，请运行 node scripts/build-content.js');
  assert.ok(status.dataOk, 'demo/js/data.js 已过期，请运行 node scripts/build-content.js');

  const bundled = require(path.join(__dirname, '..', 'demo', 'js', 'data.js'));
  assert.equal(bundled.schemaVersion, 2);
  assert.equal(bundled.contentVersion, manifest.contentVersion);
  assert.equal(bundled.topics.length, 8);
  assert.equal(
    bundled.topics.reduce((sum, topic) => sum + topic.questions.length, 0),
    120
  );
  assert.ok(fs.existsSync(lib.BUNDLE_PATH));
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const dataPath = path.join(__dirname, '..', 'demo', 'js', 'data.js');
let data;

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

test('data.js 可被 Node 加载并导出数据', () => {
  data = require(dataPath);
  assert.ok(data && typeof data === 'object', '应通过 module.exports 导出对象');
});

test('内置题库包含 schema 版本、内容版本与 8 个主题', () => {
  assert.equal(data.schemaVersion, 2);
  assert.match(data.contentVersion, /^\d+\.\d+\.\d+$/);
  assert.match(data.releasedAt, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(Array.isArray(data.notes) && data.notes.length >= 3);
  assert.ok(Array.isArray(data.topics));
  assert.equal(data.topics.length, 8);
  assert.deepEqual(data.topics.map((topic) => topic.id), expectedTopics);
});

for (const topicId of expectedTopics) {
  test(`主题 ${topicId} 内容完整`, () => {
    const topic = data.topics.find((item) => item.id === topicId);
    assert.ok(topic, `缺少主题 ${topicId}`);

    for (const field of ['title', 'tagline', 'description', 'level', 'icon']) {
      assert.equal(typeof topic[field], 'string', `${topicId}.${field} 应为字符串`);
      assert.ok(topic[field].trim().length > 0, `${topicId}.${field} 不应为空`);
    }
    assert.match(topic.accent, /^#[0-9a-fA-F]{6}$/);
    assert.ok(Number.isInteger(topic.estimatedMinutes) && topic.estimatedMinutes > 0);
    assert.ok(Array.isArray(topic.objectives) && topic.objectives.length >= 3 && topic.objectives.length <= 5);

    assert.ok(Array.isArray(topic.cards));
    assert.equal(topic.cards.length, 4, `${topicId} 应有 4 张知识卡`);
    for (const [index, card] of topic.cards.entries()) {
      assert.match(card.id, new RegExp(`^${topicId}-card-\\d{2}$`));
      assert.ok(card.title.trim().length > 0, `${topicId} 第 ${index + 1} 张知识卡缺少标题`);
      assert.ok(card.summary.trim().length > 0);
      assert.ok(Array.isArray(card.points) && card.points.length >= 4 && card.points.length <= 6);
      assert.ok(Array.isArray(card.pitfalls) && card.pitfalls.length >= 2 && card.pitfalls.length <= 3);
      if (card.example) {
        assert.ok(['python', 'bash', 'yaml', 'dockerfile', 'sql', 'text'].includes(card.example.language));
        assert.ok(card.example.code.trim().length > 0);
      }
    }

    assert.ok(Array.isArray(topic.questions));
    assert.equal(topic.questions.length, 15, `${topicId} 应有 15 道题`);
  });
}

test('所有题目 ID 全局唯一且格式正确', () => {
  const ids = [];
  for (const topic of data.topics) {
    for (const question of topic.questions) {
      assert.match(question.id, new RegExp(`^${topic.id}-\\d{3}$`));
      ids.push(question.id);
    }
  }
  assert.equal(new Set(ids).size, ids.length, '存在重复的题目 ID');
});

test('每道题目字段合法且支持逐选项解析', () => {
  for (const topic of data.topics) {
    for (const question of topic.questions) {
      assert.equal(typeof question.question, 'string');
      assert.ok(question.question.trim().length > 0, `${question.id} 题干为空`);
      if (question.code) {
        assert.ok(['python', 'bash', 'yaml', 'dockerfile', 'sql', 'text'].includes(question.code.language));
        assert.ok(question.code.content.trim().length > 0);
      }
      assert.ok(Array.isArray(question.options));
      assert.equal(question.options.length, 4, `${question.id} 必须有 4 个选项`);
      assert.equal(new Set(question.options).size, 4, `${question.id} 选项不应重复`);
      assert.ok(Number.isInteger(question.answerIndex) && question.answerIndex >= 0 && question.answerIndex <= 3);
      assert.ok(question.explanation.trim().length >= 20, `${question.id} 解析过短`);
      assert.ok(Array.isArray(question.optionNotes) && question.optionNotes.length === 4, `${question.id} 缺少逐选项解析`);
      assert.ok(question.optionNotes.every((note) => note.trim().length >= 6));
      assert.ok(['基础', '进阶', '挑战'].includes(question.difficulty));
      assert.ok(Array.isArray(question.tags) && question.tags.length >= 1 && question.tags.length <= 3);
    }
  }
});

test('每个主题包含挑战题与代码题', () => {
  for (const topic of data.topics) {
    const challenge = topic.questions.filter((question) => question.difficulty === '挑战').length;
    const code = topic.questions.filter((question) => question.code).length;
    assert.ok(challenge >= 2, `${topic.id} 挑战题不足`);
    assert.ok(code >= 2, `${topic.id} 代码/命令题不足`);
  }
});

test('正确选项位置有足够分散度', () => {
  const globalAnswers = new Set();
  for (const topic of data.topics) {
    const localAnswers = new Set(topic.questions.map((question) => question.answerIndex));
    assert.ok(localAnswers.size >= 3, `${topic.id} 的正确选项位置过于集中`);
    for (const answer of localAnswers) globalAnswers.add(answer);
  }
  assert.equal(globalAnswers.size, 4, '全局应覆盖 A–D 四个正确位置');
});

test('内容以简体中文为主并包含完整解析', () => {
  const cjk = /[\u4e00-\u9fff]/;
  for (const topic of data.topics) {
    assert.match(topic.description, cjk);
    for (const card of topic.cards) {
      assert.match(card.summary, cjk);
      for (const pitfall of card.pitfalls) assert.match(pitfall, cjk);
    }
    for (const question of topic.questions) {
      assert.match(question.question, cjk);
      assert.match(question.explanation, cjk);
      for (const note of question.optionNotes) assert.match(note, cjk);
    }
  }
});

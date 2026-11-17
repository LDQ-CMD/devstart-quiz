'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const dataPath = path.join(__dirname, '..', 'demo', 'js', 'data.js');
let data;

test('data.js 可被 Node 加载并导出数据', () => {
  data = require(dataPath);
  assert.ok(data && typeof data === 'object', '应通过 module.exports 导出对象');
});

test('数据结构包含版本号与 5 个主题', () => {
  assert.equal(data.version, 1);
  assert.ok(Array.isArray(data.topics), 'topics 应为数组');
  assert.equal(data.topics.length, 5);

  const ids = data.topics.map((topic) => topic.id);
  assert.deepEqual(ids, ['python', 'docker', 'k8s', 'linux', 'git']);
});

for (const topicId of ['python', 'docker', 'k8s', 'linux', 'git']) {
  test(`主题 ${topicId} 内容完整`, () => {
    const topic = data.topics.find((item) => item.id === topicId);
    assert.ok(topic, `缺少主题 ${topicId}`);

    for (const field of ['title', 'tagline', 'description', 'level', 'icon']) {
      assert.equal(typeof topic[field], 'string', `${topicId}.${field} 应为字符串`);
      assert.ok(topic[field].trim().length > 0, `${topicId}.${field} 不应为空`);
    }
    assert.match(topic.accent, /^#[0-9a-fA-F]{6}$/, `${topicId}.accent 应为 6 位十六进制色值`);
    assert.ok(Number.isInteger(topic.estimatedMinutes) && topic.estimatedMinutes > 0);

    assert.ok(Array.isArray(topic.cards), `${topicId}.cards 应为数组`);
    assert.ok(topic.cards.length >= 3, `${topicId} 至少需要 3 张知识卡`);
    for (const [index, card] of topic.cards.entries()) {
      assert.equal(typeof card.title, 'string');
      assert.ok(card.title.trim().length > 0, `${topicId} 第 ${index + 1} 张知识卡缺少标题`);
      assert.equal(typeof card.summary, 'string');
      assert.ok(card.summary.trim().length > 0, `${topicId} 第 ${index + 1} 张知识卡缺少摘要`);
      assert.ok(Array.isArray(card.points) && card.points.length >= 3);
      for (const point of card.points) {
        assert.equal(typeof point, 'string');
        assert.ok(point.trim().length > 0);
      }
    }

    assert.ok(Array.isArray(topic.questions), `${topicId}.questions 应为数组`);
    assert.ok(topic.questions.length >= 8, `${topicId} 至少需要 8 道题`);
  });
}

test('所有题目 ID 全局唯一', () => {
  const ids = data.topics.flatMap((topic) => topic.questions.map((question) => question.id));
  assert.equal(new Set(ids).size, ids.length, '存在重复的题目 ID');
});

test('每道题目字段合法', () => {
  for (const topic of data.topics) {
    for (const question of topic.questions) {
      assert.match(question.id, new RegExp(`^${topic.id}-\\d{2,}$`), `题目 ID 格式不正确: ${question.id}`);
      assert.equal(typeof question.question, 'string');
      assert.ok(question.question.trim().length > 0, `${question.id} 题干为空`);
      assert.ok(Array.isArray(question.options), `${question.id} options 应为数组`);
      assert.equal(question.options.length, 4, `${question.id} 必须有 4 个选项`);
      assert.equal(new Set(question.options).size, 4, `${question.id} 选项不应重复`);
      for (const option of question.options) {
        assert.equal(typeof option, 'string');
        assert.ok(option.trim().length > 0, `${question.id} 存在空选项`);
      }
      assert.ok(Number.isInteger(question.answerIndex), `${question.id} answerIndex 应为整数`);
      assert.ok(question.answerIndex >= 0 && question.answerIndex <= 3, `${question.id} answerIndex 越界`);
      assert.equal(typeof question.explanation, 'string');
      assert.ok(question.explanation.trim().length >= 10, `${question.id} 解析过短`);
      assert.ok(['基础', '进阶'].includes(question.difficulty), `${question.id} 难度标签不合法`);
    }
  }
});

test('正确选项位置有足够分散度', () => {
  const globalAnswers = new Set();
  for (const topic of data.topics) {
    const localAnswers = new Set(topic.questions.map((question) => question.answerIndex));
    assert.ok(localAnswers.size >= 2, `${topic.id} 的正确选项位置过于集中`);
    for (const answer of localAnswers) globalAnswers.add(answer);
  }
  assert.equal(globalAnswers.size, 4, '全局应覆盖 A–D 四个正确位置');
});

test('每个主题的解析与卡片内容均使用简体中文', () => {
  const cjk = /[\u4e00-\u9fff]/;
  for (const topic of data.topics) {
    assert.match(topic.description, cjk, `${topic.id} 缺少中文描述`);
    for (const card of topic.cards) {
      assert.match(card.summary, cjk, `${topic.id} 知识卡摘要缺少中文`);
    }
    for (const question of topic.questions) {
      assert.match(question.question, cjk, `${question.id} 题干缺少中文`);
      assert.match(question.explanation, cjk, `${question.id} 解析缺少中文`);
    }
  }
});

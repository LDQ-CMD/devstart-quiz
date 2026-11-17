'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ProgressCore = require(path.join(__dirname, '..', 'demo', 'js', 'progress-core.js'));

const Q = (id, answerIndex = 0) => ({ id, answerIndex });

test('emptyProgress 生成 v2 空进度', () => {
  const progress = ProgressCore.emptyProgress(1000);
  assert.equal(progress.version, 2);
  assert.deepEqual(progress.questions, {});
  assert.deepEqual(progress.topics, {});
  assert.equal(progress.meta.createdAt, 1000);
  assert.equal(progress.meta.migratedFromV1, false);
});

test('v1 进度可迁移并保留主题统计', () => {
  const v1 = {
    python: { bestScore: 6, total: 8, attempts: 2, lastScore: 5, updatedAt: 123 },
    git: { bestScore: 3, total: 8, attempts: 1, lastScore: 3, updatedAt: 456 }
  };
  const progress = ProgressCore.normalizeProgress(v1, 999);
  assert.equal(progress.version, 2);
  assert.equal(progress.meta.migratedFromV1, true);
  assert.deepEqual(progress.topics.python, {
    attempts: 2,
    bestScore: 6,
    lastScore: 5,
    total: 8,
    updatedAt: 123
  });
  assert.equal(progress.topics.git.bestScore, 3);
  assert.deepEqual(progress.questions, {});
});

test('recordAnswer 维护对错、连对与时间', () => {
  const question = Q('python-001', 2);
  let progress = ProgressCore.emptyProgress(0);
  progress = ProgressCore.recordAnswer(progress, question, 2, 10);
  assert.deepEqual(progress.questions['python-001'], {
    attempts: 1,
    correct: 1,
    wrong: 0,
    streak: 1,
    lastCorrect: true,
    lastAt: 10,
    firstAt: 10
  });

  progress = ProgressCore.recordAnswer(progress, question, 2, 20);
  assert.equal(progress.questions['python-001'].streak, 2);

  progress = ProgressCore.recordAnswer(progress, question, 1, 30);
  assert.equal(progress.questions['python-001'].attempts, 3);
  assert.equal(progress.questions['python-001'].correct, 2);
  assert.equal(progress.questions['python-001'].wrong, 1);
  assert.equal(progress.questions['python-001'].streak, 0);
  assert.equal(progress.questions['python-001'].lastCorrect, false);
  assert.equal(progress.questions['python-001'].lastAt, 30);
});

test('未作答按错误处理', () => {
  const progress = ProgressCore.recordAnswer(ProgressCore.emptyProgress(0), Q('q1', 1), null, 5);
  assert.equal(progress.questions.q1.wrong, 1);
  assert.equal(progress.questions.q1.lastCorrect, false);
});

test('recordSession 保留最高分并累计次数', () => {
  let progress = ProgressCore.recordSession(ProgressCore.emptyProgress(0), 'python', 8, 5, 10);
  assert.deepEqual(progress.topics.python, {
    attempts: 1,
    bestScore: 5,
    lastScore: 5,
    total: 8,
    updatedAt: 10
  });
  progress = ProgressCore.recordSession(progress, 'python', 8, 3, 20);
  assert.equal(progress.topics.python.bestScore, 5);
  assert.equal(progress.topics.python.lastScore, 3);
  assert.equal(progress.topics.python.attempts, 2);
});

test('掌握度按连对计算，正确一次算半分', () => {
  const topic = {
    id: 'demo',
    questions: [Q('q1'), Q('q2'), Q('q3'), Q('q4')]
  };
  let progress = ProgressCore.emptyProgress(0);
  progress = ProgressCore.recordAnswer(progress, Q('q1'), 0, 10);
  progress = ProgressCore.recordAnswer(progress, Q('q1'), 0, 20);
  progress = ProgressCore.recordAnswer(progress, Q('q2'), 0, 30);
  progress = ProgressCore.recordAnswer(progress, Q('q3'), 1, 40);

  const mastery = ProgressCore.topicMastery(progress, topic);
  assert.deepEqual(mastery, {
    percent: 38,
    mastered: 1,
    answered: 3,
    wrong: 1,
    total: 4
  });
});

test('快速练习优先未做，其次错题，再其次只对一次，最后已掌握', () => {
  const questions = [Q('q1'), Q('q2'), Q('q3'), Q('q4'), Q('q5')];
  let progress = ProgressCore.emptyProgress(0);
  progress = ProgressCore.recordAnswer(progress, Q('q1'), 0, 10);
  progress = ProgressCore.recordAnswer(progress, Q('q1'), 0, 20); // mastered
  progress = ProgressCore.recordAnswer(progress, Q('q2'), 1, 30); // wrong
  progress = ProgressCore.recordAnswer(progress, Q('q4'), 0, 40); // only once correct

  const picked = ProgressCore.pickQuestions(questions, progress, 'quick', 4).map((q) => q.id);
  assert.deepEqual(picked, ['q3', 'q5', 'q2', 'q4']);

  const limited = ProgressCore.pickQuestions(questions, progress, 'quick', 2).map((q) => q.id);
  assert.deepEqual(limited, ['q3', 'q5']);
});

test('错题模式只返回最后答错的题，并按最久未练排序', () => {
  const questions = [Q('q1'), Q('q2'), Q('q3')];
  let progress = ProgressCore.emptyProgress(0);
  progress = ProgressCore.recordAnswer(progress, Q('q1'), 1, 10); // wrong at 10
  progress = ProgressCore.recordAnswer(progress, Q('q2'), 1, 20); // wrong at 20
  progress = ProgressCore.recordAnswer(progress, Q('q3'), 0, 30); // correct

  const picked = ProgressCore.pickQuestions(questions, progress, 'review');
  assert.deepEqual(picked.map((q) => q.id), ['q1', 'q2']);
});

test('全部模式保持原顺序', () => {
  const questions = [Q('q3'), Q('q1'), Q('q2')];
  const picked = ProgressCore.pickQuestions(questions, ProgressCore.emptyProgress(0), 'all');
  assert.deepEqual(picked.map((q) => q.id), ['q3', 'q1', 'q2']);
});

test('错题本聚合与筛选', () => {
  const topics = [
    { id: 'python', title: 'Python', questions: [Q('p1'), Q('p2')] },
    { id: 'git', title: 'Git', questions: [Q('g1')] }
  ];
  let progress = ProgressCore.emptyProgress(0);
  progress = ProgressCore.recordAnswer(progress, Q('p1'), 1, 10);
  progress = ProgressCore.recordAnswer(progress, Q('p2'), 1, 20);
  progress = ProgressCore.recordAnswer(progress, Q('g1'), 1, 5);

  const all = ProgressCore.wrongQuestions(topics, progress);
  assert.deepEqual(all.map((item) => item.question.id), ['g1', 'p1', 'p2']);
  assert.deepEqual(ProgressCore.reviewSummary(topics, progress), [
    { topicId: 'python', title: 'Python', count: 2 },
    { topicId: 'git', title: 'Git', count: 1 }
  ]);
  assert.equal(ProgressCore.reviewCount(topics, progress), 3);
  assert.deepEqual(
    ProgressCore.wrongQuestions(topics, progress, 'python').map((item) => item.question.id),
    ['p1', 'p2']
  );
});

test('空题库不会产生 NaN', () => {
  const topic = { id: 'empty', questions: [] };
  assert.deepEqual(ProgressCore.topicMastery(ProgressCore.emptyProgress(0), topic), {
    percent: 0,
    mastered: 0,
    answered: 0,
    wrong: 0,
    total: 0
  });
  assert.deepEqual(ProgressCore.reviewSummary([], ProgressCore.emptyProgress(0)), []);
  assert.deepEqual(ProgressCore.pickQuestions([], ProgressCore.emptyProgress(0), 'quick'), []);
});

/* ------------------------- 熟练度 ------------------------- */

const DAY = 24 * 60 * 60 * 1000;

test('未作答题目熟练度为 0 且标记为未学习', () => {
  const p = ProgressCore.questionProficiency(null, DAY);
  assert.equal(p.score, 0);
  assert.equal(p.level, 'rusty');
  assert.equal(p.label, '未学习');
  assert.equal(p.attempted, false);
});

test('连续答对提升熟练度，答错后回落', () => {
  const q = Q('q1', 0);
  let progress = ProgressCore.emptyProgress(0);

  progress = ProgressCore.recordAnswer(progress, q, 0, DAY);
  const once = ProgressCore.questionProficiency(progress.questions.q1, DAY);
  assert.equal(once.score, 53);
  assert.equal(once.label, '熟悉');

  progress = ProgressCore.recordAnswer(progress, q, 0, DAY + 1);
  progress = ProgressCore.recordAnswer(progress, q, 0, DAY + 2);
  const mastered = ProgressCore.questionProficiency(progress.questions.q1, DAY + 2);
  assert.equal(mastered.score, 100);
  assert.equal(mastered.level, 'mastered');
  assert.equal(mastered.label, '掌握');

  progress = ProgressCore.recordAnswer(progress, q, 1, DAY + 3);
  progress = ProgressCore.recordAnswer(progress, q, 0, DAY + 4);
  const afterWrong = ProgressCore.questionProficiency(progress.questions.q1, DAY + 4);
  assert.equal(afterWrong.level, 'proficient');
  assert.ok(afterWrong.score < mastered.score);
  assert.equal(afterWrong.streak, 1);
});

test('熟练度随时间衰减，久未练习会降档', () => {
  const q = Q('q1', 0);
  let progress = ProgressCore.emptyProgress(0);
  progress = ProgressCore.recordAnswer(progress, q, 0, 0);
  progress = ProgressCore.recordAnswer(progress, q, 0, 1);
  progress = ProgressCore.recordAnswer(progress, q, 0, 2);

  const fresh = ProgressCore.questionProficiency(progress.questions.q1, 2);
  const stale = ProgressCore.questionProficiency(progress.questions.q1, 30 * DAY + 2);
  assert.equal(fresh.score, 100);
  assert.equal(stale.score, 88);
  assert.equal(stale.level, 'proficient');
  assert.ok(stale.score < fresh.score);
});

test('主题熟练度给出分布与薄弱知识点', () => {
  const topic = {
    id: 'demo',
    questions: [
      { id: 'q1', answerIndex: 0, tags: ['变量'] },
      { id: 'q2', answerIndex: 0, tags: ['函数'] }
    ]
  };
  let progress = ProgressCore.emptyProgress(0);
  progress = ProgressCore.recordAnswer(progress, Q('q1', 0), 0, DAY);
  progress = ProgressCore.recordAnswer(progress, Q('q1', 0), 0, DAY + 1);
  progress = ProgressCore.recordAnswer(progress, Q('q1', 0), 0, DAY + 2);

  const p = ProgressCore.topicProficiency(progress, topic, DAY + 2);
  assert.equal(p.total, 2);
  assert.equal(p.score, 50);
  assert.equal(p.label, '熟悉');
  assert.deepEqual(p.distribution, { rusty: 0, familiar: 0, proficient: 0, mastered: 1, unlearned: 1 });
  assert.deepEqual(p.weakPoints, [{ tag: '函数', score: 0, weak: 1, count: 1 }]);
});

test('全局薄弱知识点按分数升序汇总', () => {
  const topics = [
    { id: 'a', questions: [{ id: 'a1', answerIndex: 0, tags: ['变量'] }] },
    { id: 'b', questions: [{ id: 'b1', answerIndex: 0, tags: ['函数'] }] }
  ];
  let progress = ProgressCore.emptyProgress(0);
  progress = ProgressCore.recordAnswer(progress, Q('a1', 0), 0, DAY);
  progress = ProgressCore.recordAnswer(progress, Q('b1', 0), 1, DAY);

  const points = ProgressCore.weakPointSummary(topics, progress, DAY);
  assert.deepEqual(points.map((item) => item.tag), ['函数', '变量']);
  assert.equal(points[0].score, 13);
  assert.ok(points[0].score <= points[1].score);
});

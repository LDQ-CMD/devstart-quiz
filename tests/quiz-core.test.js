'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const quizCore = require(path.join(__dirname, '..', 'demo', 'js', 'quiz-core.js'));

const questions = [
  { id: 'q1', answerIndex: 0 },
  { id: 'q2', answerIndex: 2 },
  { id: 'q3', answerIndex: 1 },
  { id: 'q4', answerIndex: 3 },
];

test('quiz-core 导出 gradeQuiz 函数', () => {
  assert.equal(typeof quizCore.gradeQuiz, 'function');
});

test('全部答对', () => {
  const result = quizCore.gradeQuiz(questions, [0, 2, 1, 3]);
  assert.equal(result.correct, 4);
  assert.equal(result.total, 4);
  assert.equal(result.percent, 100);
  assert.equal(result.details.length, 4);
  assert.ok(result.details.every((detail) => detail.isCorrect));
});

test('全部答错', () => {
  const result = quizCore.gradeQuiz(questions, [1, 0, 3, 2]);
  assert.equal(result.correct, 0);
  assert.equal(result.percent, 0);
  assert.ok(result.details.every((detail) => !detail.isCorrect));
});

test('部分答对并正确取整', () => {
  const result = quizCore.gradeQuiz(questions.slice(0, 3), [0, 2, 3]);
  assert.equal(result.correct, 2);
  assert.equal(result.total, 3);
  assert.equal(result.percent, 67);
});

test('空答案按错误处理', () => {
  const result = quizCore.gradeQuiz(questions, []);
  assert.equal(result.correct, 0);
  assert.equal(result.total, 4);
  assert.equal(result.percent, 0);
  assert.deepEqual(
    result.details.map((detail) => detail.selectedIndex),
    [null, null, null, null],
  );
});

test('null 与缺省答案按错误处理，且不中断判分', () => {
  const result = quizCore.gradeQuiz(questions, [null, 2]);
  assert.equal(result.correct, 1);
  assert.equal(result.total, 4);
  assert.equal(result.percent, 25);
  assert.equal(result.details[1].isCorrect, true);
  assert.equal(result.details[2].selectedIndex, null);
});

test('判分明细包含题号、所选与正确答案', () => {
  const result = quizCore.gradeQuiz(questions, [0, 1, 1, 0]);
  assert.deepEqual(result.details[0], {
    questionId: 'q1',
    selectedIndex: 0,
    correctIndex: 0,
    isCorrect: true,
  });
  assert.deepEqual(result.details[1], {
    questionId: 'q2',
    selectedIndex: 1,
    correctIndex: 2,
    isCorrect: false,
  });
});

test('空题库不会产生 NaN', () => {
  const result = quizCore.gradeQuiz([], []);
  assert.equal(result.correct, 0);
  assert.equal(result.total, 0);
  assert.equal(result.percent, 0);
  assert.deepEqual(result.details, []);
});

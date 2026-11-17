/*
 * QuizCore — 判分核心
 * UMD wrapper: works in browser (window.QuizCore) and Node (module.exports).
 * Dependency-free. Tolerates short/null answer arrays (missing = 未作答 = 判错).
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module !== null && typeof module.exports === "object") {
    module.exports = api;
  }
  if (root && typeof root === "object") {
    root.QuizCore = api;
  }
}(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function normalizeIndex(value) {
    return typeof value === "number" && isFinite(value) && value >= 0 ? value : null;
  }

  /**
   * gradeQuiz(questions, answers)
   * @param {Array} questions  题目数组，每项含 id、answerIndex 等
   * @param {Array} answers    与 questions 等长的已选项下标数组（缺失按 null 处理）
   * @returns {{correct:number,total:number,percent:number,details:Array}}
   */
  function gradeQuiz(questions, answers) {
    var list = Array.isArray(questions) ? questions : [];
    var picked = Array.isArray(answers) ? answers : [];
    var details = [];
    var correct = 0;

    for (var i = 0; i < list.length; i++) {
      var q = list[i] || {};
      var selectedIndex = normalizeIndex(picked[i]);
      var correctIndex = normalizeIndex(q.answerIndex);
      var isCorrect = selectedIndex !== null && selectedIndex === correctIndex;
      if (isCorrect) correct++;
      details.push({
        questionId: q.id != null ? String(q.id) : "q-" + (i + 1),
        selectedIndex: selectedIndex,
        correctIndex: correctIndex,
        isCorrect: isCorrect
      });
    }

    var total = list.length;
    return {
      correct: correct,
      total: total,
      percent: total > 0 ? Math.round((correct / total) * 100) : 0,
      details: details
    };
  }

  return { gradeQuiz: gradeQuiz };
}));

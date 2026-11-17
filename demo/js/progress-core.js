/*
 * 起点编程 DevStart — 学习进度核心
 * UMD：浏览器 window.ProgressCore / Node module.exports。
 * 负责 v1→v2 迁移、逐题统计、掌握度、错题与组卷优先级。
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module !== null && typeof module.exports === "object") {
    module.exports = api;
  }
  if (root && typeof root === "object") {
    root.ProgressCore = api;
  }
}(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var VERSION = 2;
  var KEY = "devstart:progress:v2";

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function emptyProgress(now) {
    return {
      version: VERSION,
      questions: {},
      topics: {},
      meta: {
        createdAt: Number.isFinite(now) ? now : Date.now(),
        migratedFromV1: false
      }
    };
  }

  function normalizeQuestionStat(stat) {
    if (!isObject(stat)) return null;
    return {
      attempts: Number(stat.attempts) || 0,
      correct: Number(stat.correct) || 0,
      wrong: Number(stat.wrong) || 0,
      streak: Number(stat.streak) || 0,
      lastCorrect: stat.lastCorrect === true,
      lastAt: Number(stat.lastAt) || 0,
      firstAt: Number(stat.firstAt) || Number(stat.lastAt) || 0
    };
  }

  function normalizeTopicStat(stat) {
    if (!isObject(stat)) return null;
    return {
      attempts: Number(stat.attempts) || 0,
      bestScore: Number(stat.bestScore) || 0,
      lastScore: Number(stat.lastScore) || 0,
      total: Number(stat.total) || 0,
      updatedAt: Number(stat.updatedAt) || 0
    };
  }

  /** 将 v1 的 { topicId: { bestScore, attempts, ... } } 迁移为 v2。 */
  function migrateProgress(v1, now) {
    var next = emptyProgress(now);
    if (!isObject(v1)) return next;
    var reserved = { version: true, questions: true, topics: true, meta: true };
    Object.keys(v1).forEach(function (key) {
      if (reserved[key]) return;
      var stat = normalizeTopicStat(v1[key]);
      if (stat) next.topics[key] = stat;
    });
    next.meta.migratedFromV1 = true;
    return next;
  }

  function normalizeProgress(raw, now) {
    if (!isObject(raw)) return emptyProgress(now);
    if (raw.version !== VERSION) return migrateProgress(raw, now);

    var next = emptyProgress(raw.meta && raw.meta.createdAt ? raw.meta.createdAt : now);
    next.meta.migratedFromV1 = Boolean(raw.meta && raw.meta.migratedFromV1);
    if (isObject(raw.questions)) {
      Object.keys(raw.questions).forEach(function (id) {
        var stat = normalizeQuestionStat(raw.questions[id]);
        if (stat) next.questions[id] = stat;
      });
    }
    if (isObject(raw.topics)) {
      Object.keys(raw.topics).forEach(function (id) {
        var stat = normalizeTopicStat(raw.topics[id]);
        if (stat) next.topics[id] = stat;
      });
    }
    return next;
  }

  function recordAnswer(progress, question, selectedIndex, now) {
    var next = clone(normalizeProgress(progress, now));
    if (!question || typeof question.id !== "string") return next;
    var timestamp = Number.isFinite(now) ? now : Date.now();
    var stat = next.questions[question.id] || {
      attempts: 0,
      correct: 0,
      wrong: 0,
      streak: 0,
      lastCorrect: false,
      lastAt: 0,
      firstAt: timestamp
    };
    var isCorrect = Number(selectedIndex) === Number(question.answerIndex);
    stat.attempts += 1;
    if (isCorrect) {
      stat.correct += 1;
      stat.streak += 1;
      stat.lastCorrect = true;
    } else {
      stat.wrong += 1;
      stat.streak = 0;
      stat.lastCorrect = false;
    }
    stat.lastAt = timestamp;
    if (!stat.firstAt) stat.firstAt = timestamp;
    next.questions[question.id] = stat;
    return next;
  }

  function recordSession(progress, topicId, total, correct, now) {
    var next = clone(normalizeProgress(progress, now));
    var timestamp = Number.isFinite(now) ? now : Date.now();
    var stat = next.topics[topicId] || {
      attempts: 0,
      bestScore: 0,
      lastScore: 0,
      total: 0,
      updatedAt: 0
    };
    stat.attempts += 1;
    stat.bestScore = Math.max(stat.bestScore, correct);
    stat.lastScore = correct;
    stat.total = total;
    stat.updatedAt = timestamp;
    next.topics[topicId] = stat;
    return next;
  }

  function topicMastery(progress, topic) {
    var normalized = normalizeProgress(progress);
    var questions = topic && Array.isArray(topic.questions) ? topic.questions : [];
    var total = questions.length;
    var units = 0;
    var mastered = 0;
    var answered = 0;
    var wrong = 0;

    questions.forEach(function (question) {
      var stat = normalized.questions[question.id];
      if (!stat || stat.attempts === 0) return;
      answered += 1;
      if (stat.lastCorrect !== true) {
        wrong += 1;
        return;
      }
      if (stat.streak >= 2) {
        units += 1;
        mastered += 1;
      } else {
        units += 0.5;
      }
    });

    return {
      percent: total > 0 ? Math.round((units / total) * 100) : 0,
      mastered: mastered,
      answered: answered,
      wrong: wrong,
      total: total
    };
  }

  function topicStat(progress, topicId) {
    var normalized = normalizeProgress(progress);
    return normalized.topics[topicId] || null;
  }

  function questionStat(progress, questionId) {
    var normalized = normalizeProgress(progress);
    return normalized.questions[questionId] || null;
  }

  function wrongQuestions(topics, progress, topicId) {
    var normalized = normalizeProgress(progress);
    var items = [];
    (topics || []).forEach(function (topic) {
      if (topicId && topic.id !== topicId) return;
      (topic.questions || []).forEach(function (question) {
        var stat = normalized.questions[question.id];
        if (stat && stat.lastCorrect === false) {
          items.push({
            topicId: topic.id,
            topicTitle: topic.title,
            question: question,
            stat: stat
          });
        }
      });
    });
    items.sort(function (a, b) {
      return a.stat.lastAt - b.stat.lastAt;
    });
    return items;
  }

  function reviewSummary(topics, progress) {
    var normalized = normalizeProgress(progress);
    var summary = [];
    (topics || []).forEach(function (topic) {
      var count = (topic.questions || []).filter(function (question) {
        var stat = normalized.questions[question.id];
        return stat && stat.lastCorrect === false;
      }).length;
      if (count > 0) {
        summary.push({ topicId: topic.id, title: topic.title, count: count });
      }
    });
    return summary;
  }

  function reviewCount(topics, progress) {
    return reviewSummary(topics, progress).reduce(function (sum, item) {
      return sum + item.count;
    }, 0);
  }

  function priorityOf(stat) {
    if (!stat || stat.attempts === 0) return 0;
    if (stat.lastCorrect !== true) return 1;
    if (stat.streak >= 2) return 3;
    return 2;
  }

  /**
   * pickQuestions(questions, progress, mode, limit)
   * mode: "quick"（默认 8 题）| "all" | "review"
   */
  function pickQuestions(questions, progress, mode, limit) {
    var list = Array.isArray(questions) ? questions.slice() : [];
    var normalized = normalizeProgress(progress);
    var requested = mode || "quick";

    var decorated = list.map(function (question, index) {
      var stat = normalized.questions[question.id];
      return { question: question, index: index, stat: stat, priority: priorityOf(stat) };
    });

    if (requested === "all") {
      return decorated.map(function (item) { return item.question; });
    }

    if (requested === "review") {
      decorated = decorated.filter(function (item) { return item.priority === 1; });
      decorated.sort(function (a, b) {
        var aAt = a.stat ? a.stat.lastAt : 0;
        var bAt = b.stat ? b.stat.lastAt : 0;
        return aAt - bAt || a.index - b.index;
      });
      return applyLimit(decorated, limit);
    }

    decorated.sort(function (a, b) {
      if (a.priority !== b.priority) return a.priority - b.priority;
      var aAt = a.stat ? a.stat.lastAt : 0;
      var bAt = b.stat ? b.stat.lastAt : 0;
      return aAt - bAt || a.index - b.index;
    });
    return applyLimit(decorated, limit == null ? 8 : limit);
  }

  function applyLimit(decorated, limit) {
    var max = Number.isFinite(limit) && limit >= 0 ? limit : decorated.length;
    return decorated.slice(0, max).map(function (item) { return item.question; });
  }

  /* ------------------------------------------------------------------ *
   * 熟练度（Proficiency）
   * 掌握度只看「最近是否连对」，熟练度进一步综合正确率、连对、作答次数
   * 与间隔时间，给出 0–100 分与四级画像，并聚合出薄弱知识点。
   * 不改动既有 topicMastery，保证旧调用与历史进度兼容。
   * ------------------------------------------------------------------ */
  var DAY_MS = 24 * 60 * 60 * 1000;
  var PROFICIENCY_LEVELS = [
    { min: 90, key: "mastered", label: "掌握", desc: "稳定正确，隔一段时间回顾即可" },
    { min: 70, key: "proficient", label: "熟练", desc: "基本掌握，偶尔复练保持手感" },
    { min: 40, key: "familiar", label: "熟悉", desc: "还需巩固，建议再练几次" },
    { min: 0, key: "rusty", label: "生疏", desc: "重点回炉，先看知识卡再练" }
  ];

  function proficiencyLevel(score) {
    for (var i = 0; i < PROFICIENCY_LEVELS.length; i += 1) {
      if (score >= PROFICIENCY_LEVELS[i].min) return PROFICIENCY_LEVELS[i];
    }
    return PROFICIENCY_LEVELS[PROFICIENCY_LEVELS.length - 1];
  }

  function recencyFactor(lastAt, now) {
    if (!lastAt) return 0;
    var days = Math.max(0, (now - lastAt) / DAY_MS);
    return Math.max(0.4, 1 - (Math.min(days, 30) / 30) * 0.6);
  }

  /** 单题熟练度。综合正确率(50%)、连对(30%)、新鲜度(20%)，并以作答次数作置信度。 */
  function questionProficiency(stat, now) {
    var ts = Number.isFinite(now) ? now : Date.now();
    var s = normalizeQuestionStat(stat);
    if (!s || s.attempts === 0) {
      return { score: 0, level: "rusty", label: "未学习", desc: "尚未作答", attempted: false };
    }
    var accuracy = s.correct / s.attempts;
    var streakRate = Math.min(s.streak, 3) / 3;
    var recency = recencyFactor(s.lastAt, ts);
    var exposure = Math.min(s.attempts, 3) / 3;
    var base = 0.5 * accuracy + 0.3 * streakRate + 0.2 * recency;
    var confidence = 0.5 + 0.5 * exposure;
    var score = Math.round(100 * base * confidence);
    var level = proficiencyLevel(score);
    return {
      score: score,
      level: level.key,
      label: level.label,
      desc: level.desc,
      attempted: true,
      accuracy: Math.round(accuracy * 100),
      streak: s.streak,
      attempts: s.attempts
    };
  }

  /** 主题熟练度：题目均值 + 四级分布 + 按标签聚合的薄弱知识点（最多 5 个）。 */
  function topicProficiency(progress, topic, now) {
    var normalized = normalizeProgress(progress);
    var questions = topic && Array.isArray(topic.questions) ? topic.questions : [];
    var total = questions.length;
    var distribution = { rusty: 0, familiar: 0, proficient: 0, mastered: 0, unlearned: 0 };
    var tagMap = {};
    var sum = 0;

    questions.forEach(function (question) {
      var p = questionProficiency(normalized.questions[question.id], now);
      sum += p.score;
      if (!p.attempted) distribution.unlearned += 1;
      else distribution[p.level] += 1;

      var tags = Array.isArray(question.tags) ? question.tags : [];
      tags.forEach(function (tag) {
        if (!tagMap[tag]) tagMap[tag] = { tag: tag, sum: 0, count: 0, weak: 0 };
        tagMap[tag].sum += p.score;
        tagMap[tag].count += 1;
        if (!p.attempted || p.score < 70) tagMap[tag].weak += 1;
      });
    });

    var weakPoints = Object.keys(tagMap).map(function (tag) {
      var item = tagMap[tag];
      return {
        tag: tag,
        score: Math.round(item.sum / item.count),
        weak: item.weak,
        count: item.count
      };
    }).filter(function (item) {
      return item.weak > 0;
    }).sort(function (a, b) {
      return a.score - b.score || b.weak - a.weak;
    });

    var score = total > 0 ? Math.round(sum / total) : 0;
    var level = proficiencyLevel(score);
    return {
      score: score,
      level: level.key,
      label: level.label,
      desc: level.desc,
      distribution: distribution,
      weakPoints: weakPoints.slice(0, 5),
      total: total
    };
  }

  /** 跨主题汇总薄弱知识点，供全局「提分建议」使用。 */
  function weakPointSummary(topics, progress, now) {
    var normalized = normalizeProgress(progress);
    var map = {};
    (topics || []).forEach(function (topic) {
      (topic.questions || []).forEach(function (question) {
        var p = questionProficiency(normalized.questions[question.id], now);
        var tags = Array.isArray(question.tags) ? question.tags : [];
        tags.forEach(function (tag) {
          if (!map[tag]) map[tag] = { tag: tag, sum: 0, count: 0, weak: 0 };
          map[tag].sum += p.score;
          map[tag].count += 1;
          if (!p.attempted || p.score < 70) map[tag].weak += 1;
        });
      });
    });
    return Object.keys(map).map(function (tag) {
      var item = map[tag];
      return { tag: tag, score: Math.round(item.sum / item.count), weak: item.weak, count: item.count };
    }).filter(function (item) {
      return item.weak > 0;
    }).sort(function (a, b) {
      return a.score - b.score || b.weak - a.weak;
    }).slice(0, 8);
  }

  return {
    VERSION: VERSION,
    KEY: KEY,
    emptyProgress: emptyProgress,
    normalizeProgress: normalizeProgress,
    migrateProgress: migrateProgress,
    recordAnswer: recordAnswer,
    recordSession: recordSession,
    topicMastery: topicMastery,
    topicStat: topicStat,
    questionStat: questionStat,
    wrongQuestions: wrongQuestions,
    reviewSummary: reviewSummary,
    reviewCount: reviewCount,
    pickQuestions: pickQuestions,
    PROFICIENCY_LEVELS: PROFICIENCY_LEVELS,
    proficiencyLevel: proficiencyLevel,
    questionProficiency: questionProficiency,
    topicProficiency: topicProficiency,
    weakPointSummary: weakPointSummary
  };
}));

'use strict';

/**
 * 题库内容校验与构建的共享逻辑。
 * 数据源：demo/content/packs/*.json
 * 生成物：demo/content/bundle.json、demo/js/data.js
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'demo', 'content');
const MANIFEST_PATH = path.join(CONTENT_DIR, 'manifest.json');
const BUNDLE_PATH = path.join(CONTENT_DIR, 'bundle.json');
const DATA_PATH = path.join(ROOT, 'demo', 'js', 'data.js');

const ICONS = new Set(['python', 'docker', 'k8s', 'linux', 'git', 'network', 'sql', 'structure']);
const LANGUAGES = new Set(['python', 'bash', 'yaml', 'dockerfile', 'sql', 'text']);
const DIFFICULTIES = ['基础', '进阶', '挑战'];
const CJK = /[\u4e00-\u9fff]/;

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function validateExample(example, where, errors) {
  if (example == null) return;
  if (!isObject(example)) {
    errors.push(`${where}: example 必须是对象`);
    return;
  }
  if (!LANGUAGES.has(example.language)) errors.push(`${where}: example.language 不合法`);
  if (!isNonEmptyString(example.caption)) errors.push(`${where}: example.caption 不能为空`);
  if (!isNonEmptyString(example.code)) errors.push(`${where}: example.code 不能为空`);
  if (isNonEmptyString(example.code) && example.code.split('\n').length > 15) {
    errors.push(`${where}: example.code 超过 15 行`);
  }
}

function validateQuestion(question, topicId, where, errors, stats) {
  if (!isObject(question)) {
    errors.push(`${where}: 题目必须是对象`);
    return;
  }
  const id = question.id;
  if (!isNonEmptyString(id)) {
    errors.push(`${where}: 缺少 id`);
  } else if (!new RegExp(`^${topicId}-\\d{3}$`).test(id)) {
    errors.push(`${where}: 题目 id 应为 ${topicId}-001 格式`);
  }

  if (!isNonEmptyString(question.question) || !CJK.test(question.question)) {
    errors.push(`${where}: 题干不能为空且必须包含中文`);
  }
  if (question.question && question.question.length > 140) {
    errors.push(`${where}: 题干过长（>140 字）`);
  }

  if (question.code != null) {
    stats.codeQuestions += 1;
    if (!isObject(question.code)) {
      errors.push(`${where}: code 必须是对象`);
    } else {
      if (!LANGUAGES.has(question.code.language)) errors.push(`${where}: code.language 不合法`);
      if (!isNonEmptyString(question.code.content)) errors.push(`${where}: code.content 不能为空`);
      else if (question.code.content.split('\n').length > 20) errors.push(`${where}: code.content 超过 20 行`);
    }
  }

  if (!Array.isArray(question.options) || question.options.length !== 4) {
    errors.push(`${where}: options 必须是 4 项数组`);
  } else {
    if (new Set(question.options).size !== 4) errors.push(`${where}: options 不能重复`);
    for (const option of question.options) {
      if (!isNonEmptyString(option)) errors.push(`${where}: 存在空选项`);
      if (isNonEmptyString(option) && /^以上(都|均)/.test(option)) {
        errors.push(`${where}: 不允许使用「以上都对/都不对」选项`);
      }
    }
  }

  if (!Number.isInteger(question.answerIndex) || question.answerIndex < 0 || question.answerIndex > 3) {
    errors.push(`${where}: answerIndex 必须是 0–3 的整数`);
  }

  if (!isNonEmptyString(question.explanation) || !CJK.test(question.explanation)) {
    errors.push(`${where}: explanation 不能为空且必须包含中文`);
  } else if (question.explanation.length < 20) {
    errors.push(`${where}: explanation 过短（至少 20 字）`);
  }

  if (!Array.isArray(question.optionNotes) || question.optionNotes.length !== 4) {
    errors.push(`${where}: optionNotes 必须是 4 项数组`);
  } else {
    for (const note of question.optionNotes) {
      if (!isNonEmptyString(note) || note.length < 6) errors.push(`${where}: optionNotes 每项至少 6 字`);
    }
  }

  if (!DIFFICULTIES.includes(question.difficulty)) {
    errors.push(`${where}: difficulty 必须是 基础/进阶/挑战`);
  } else {
    stats.difficulty[question.difficulty] += 1;
  }

  if (!Array.isArray(question.tags) || question.tags.length < 1 || question.tags.length > 3) {
    errors.push(`${where}: tags 必须是 1–3 个`);
  } else if (question.tags.some((tag) => !isNonEmptyString(tag))) {
    errors.push(`${where}: tags 不能包含空值`);
  }
}

function validatePack(pack, options = {}) {
  const errors = [];
  const warnings = [];
  const expectedId = options.expectedId;
  const stats = { questions: 0, cards: 0, codeQuestions: 0, difficulty: { 基础: 0, 进阶: 0, 挑战: 0 } };

  if (!isObject(pack)) return { errors: ['内容包必须是对象'], warnings, stats };
  if (pack.schemaVersion !== 2) errors.push('schemaVersion 必须为 2');
  if (!isNonEmptyString(pack.id)) errors.push('缺少 id');
  if (expectedId && pack.id !== expectedId) errors.push(`id ${pack.id} 与文件名 ${expectedId} 不一致`);

  for (const field of ['title', 'tagline', 'description', 'level', 'icon']) {
    if (!isNonEmptyString(pack[field])) errors.push(`${field} 不能为空`);
  }
  if (isNonEmptyString(pack.description) && !CJK.test(pack.description)) errors.push('description 必须包含中文');
  if (!/^#[0-9a-fA-F]{6}$/.test(pack.accent || '')) errors.push('accent 必须是 6 位十六进制色值');
  if (!ICONS.has(pack.icon)) errors.push(`icon 必须是 ${Array.from(ICONS).join('/')} 之一`);
  if (!Number.isInteger(pack.estimatedMinutes) || pack.estimatedMinutes <= 0) {
    errors.push('estimatedMinutes 必须是正整数');
  }

  if (!Array.isArray(pack.objectives) || pack.objectives.length < 3 || pack.objectives.length > 5) {
    errors.push('objectives 必须是 3–5 条');
  } else if (pack.objectives.some((item) => !isNonEmptyString(item) || !CJK.test(item))) {
    errors.push('objectives 每项都必须是非空中文');
  }

  if (!Array.isArray(pack.cards) || pack.cards.length !== 4) {
    errors.push('每个主题必须有 4 张知识卡');
  } else {
    stats.cards = pack.cards.length;
    const cardIds = new Set();
    pack.cards.forEach((card, index) => {
      const where = `知识卡 ${index + 1}`;
      if (!isObject(card)) {
        errors.push(`${where}: 必须是对象`);
        return;
      }
      if (!new RegExp(`^${pack.id}-card-\\d{2}$`).test(card.id || '')) {
        errors.push(`${where}: id 应为 ${pack.id}-card-01 格式`);
      }
      if (cardIds.has(card.id)) errors.push(`${where}: id 重复`);
      cardIds.add(card.id);
      if (!isNonEmptyString(card.title) || !CJK.test(card.title)) errors.push(`${where}: title 不能为空且包含中文`);
      if (!isNonEmptyString(card.summary) || !CJK.test(card.summary)) errors.push(`${where}: summary 不能为空且包含中文`);
      if (!Array.isArray(card.points) || card.points.length < 4 || card.points.length > 6) {
        errors.push(`${where}: points 必须是 4–6 条`);
      } else if (card.points.some((point) => !isNonEmptyString(point))) {
        errors.push(`${where}: points 不能包含空值`);
      }
      validateExample(card.example, where, errors);
      if (!Array.isArray(card.pitfalls) || card.pitfalls.length < 2 || card.pitfalls.length > 3) {
        errors.push(`${where}: pitfalls 必须是 2–3 条`);
      } else if (card.pitfalls.some((pitfall) => !isNonEmptyString(pitfall))) {
        errors.push(`${where}: pitfalls 不能包含空值`);
      }
    });
  }

  if (!Array.isArray(pack.questions) || pack.questions.length !== 15) {
    errors.push('每个主题必须有 15 道题');
  } else {
    stats.questions = pack.questions.length;
    const ids = new Set();
    const answerIndexes = [];
    pack.questions.forEach((question, index) => {
      const where = `第 ${index + 1} 题`;
      validateQuestion(question, pack.id, where, errors, stats);
      if (question && question.id) {
        if (ids.has(question.id)) errors.push(`${where}: id 重复 ${question.id}`);
        ids.add(question.id);
      }
      if (question && Number.isInteger(question.answerIndex)) answerIndexes.push(question.answerIndex);
    });

    if (stats.difficulty['基础'] < 6) errors.push('基础题至少 6 道');
    if (stats.difficulty['进阶'] < 4) errors.push('进阶题至少 4 道');
    if (stats.difficulty['挑战'] < 2) errors.push('挑战题至少 2 道');

    const distribution = [0, 0, 0, 0];
    for (const answer of answerIndexes) distribution[answer] += 1;
    if (distribution.some((count) => count < 2)) {
      errors.push(`正确选项分布过于集中：A/B/C/D = ${distribution.join('/')}，每个位置至少 2 次`);
    }
    let run = 1;
    for (let i = 1; i < answerIndexes.length; i++) {
      run = answerIndexes[i] === answerIndexes[i - 1] ? run + 1 : 1;
      if (run >= 4) {
        errors.push('正确选项连续 4 题相同，请打散');
        break;
      }
    }
    if (stats.codeQuestions < 2) {
      warnings.push(`代码/命令阅读题只有 ${stats.codeQuestions} 道，建议至少 4 道以保证深度`);
    }
  }

  return { errors, warnings, stats };
}

function validateManifest(manifest, options = {}) {
  const errors = [];
  if (!isObject(manifest)) return ['manifest 必须是对象'];
  if (manifest.schemaVersion !== 2) errors.push('manifest.schemaVersion 必须为 2');
  if (!/^\d+\.\d+\.\d+$/.test(manifest.contentVersion || '')) errors.push('contentVersion 必须是语义化版本，如 2.0.0');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(manifest.releasedAt || '')) errors.push('releasedAt 必须是 YYYY-MM-DD');
  if (!Array.isArray(manifest.notes) || manifest.notes.length === 0 || manifest.notes.some((n) => !isNonEmptyString(n))) {
    errors.push('notes 必须是非空字符串数组');
  }
  if (!Array.isArray(manifest.packs) || manifest.packs.length === 0) {
    errors.push('packs 必须是非空数组');
  } else {
    if (new Set(manifest.packs).size !== manifest.packs.length) errors.push('packs 不能重复');
    for (const file of manifest.packs) {
      if (typeof file !== 'string' || !/^packs\/[a-z0-9-]+\.json$/.test(file)) {
        errors.push(`packs 路径不合法: ${file}`);
      }
    }
    if (options.expectedCount && manifest.packs.length !== options.expectedCount) {
      errors.push(`packs 数量应为 ${options.expectedCount}，实际 ${manifest.packs.length}`);
    }
  }
  return errors;
}

function validateContent(packs, manifest) {
  const errors = [];
  const warnings = [];
  const stats = {
    topics: packs.length,
    questions: 0,
    cards: 0,
    codeQuestions: 0,
    difficulty: { 基础: 0, 进阶: 0, 挑战: 0 }
  };

  const manifestErrors = validateManifest(manifest);
  errors.push(...manifestErrors);

  const topicIds = new Set();
  const allQuestionIds = new Set();
  const allQuestionTexts = new Set();

  for (const pack of packs) {
    const result = validatePack(pack);
    errors.push(...result.errors.map((error) => `[${pack && pack.id ? pack.id : '未知主题'}] ${error}`));
    warnings.push(...result.warnings.map((warning) => `[${pack && pack.id ? pack.id : '未知主题'}] ${warning}`));

    if (pack && pack.id) {
      if (topicIds.has(pack.id)) errors.push(`主题 id 重复: ${pack.id}`);
      topicIds.add(pack.id);
    }

    if (pack && Array.isArray(pack.questions)) {
      stats.questions += pack.questions.length;
      stats.codeQuestions += result.stats.codeQuestions;
      for (const difficulty of DIFFICULTIES) stats.difficulty[difficulty] += result.stats.difficulty[difficulty];
      for (const question of pack.questions) {
        if (!question || !question.id) continue;
        if (allQuestionIds.has(question.id)) errors.push(`题目 id 全局重复: ${question.id}`);
        allQuestionIds.add(question.id);
        const stem = String(question.question || '').trim();
        if (stem && allQuestionTexts.has(stem)) errors.push(`题干重复: ${question.id}`);
        allQuestionTexts.add(stem);
      }
    }
    if (pack && Array.isArray(pack.cards)) stats.cards += pack.cards.length;
  }

  if (manifest && Array.isArray(manifest.packs)) {
    const expectedIds = manifest.packs.map((file) => path.basename(file, '.json'));
    for (const id of expectedIds) {
      if (!topicIds.has(id)) errors.push(`manifest 中列出的主题缺少内容包: ${id}`);
    }
    for (const id of topicIds) {
      if (!expectedIds.includes(id)) errors.push(`存在未列入 manifest 的主题: ${id}`);
    }
  }

  return { errors, warnings, stats };
}

function loadManifest() {
  return readJson(MANIFEST_PATH);
}

function loadPacks(manifest = loadManifest()) {
  return manifest.packs.map((file) => {
    const fullPath = path.join(CONTENT_DIR, file);
    const pack = readJson(fullPath);
    return { pack, file, fullPath };
  });
}

function buildBundle(packs, manifest) {
  return {
    schemaVersion: 2,
    contentVersion: manifest.contentVersion,
    releasedAt: manifest.releasedAt,
    notes: manifest.notes,
    topics: packs.map(({ pack }) => {
      const { schemaVersion, ...topic } = pack;
      return topic;
    })
  };
}

function renderBundleJson(bundle) {
  return `${JSON.stringify(bundle, null, 2)}\n`;
}

function renderDataJs(bundle) {
  return `/*
 * 起点编程 DevStart — 内置题库（自动生成，请勿手工编辑）
 * 数据源：demo/content/packs/*.json
 * 生成命令：node scripts/build-content.js
 * 版本：${bundle.contentVersion} · ${bundle.releasedAt}
 */
(function (root, factory) {
  "use strict";
  var data = factory();
  if (typeof module === "object" && module !== null && typeof module.exports === "object") {
    module.exports = data;
  }
  if (root && typeof root === "object") {
    root.LEARN_DATA = data;
  }
}(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  return ${JSON.stringify(bundle, null, 2)};
}));
`;
}

function writeGenerated(bundle) {
  fs.writeFileSync(BUNDLE_PATH, renderBundleJson(bundle), 'utf8');
  fs.writeFileSync(DATA_PATH, renderDataJs(bundle), 'utf8');
}

function generatedIsCurrent(bundle) {
  const bundleOk = fs.existsSync(BUNDLE_PATH) && fs.readFileSync(BUNDLE_PATH, 'utf8') === renderBundleJson(bundle);
  const dataOk = fs.existsSync(DATA_PATH) && fs.readFileSync(DATA_PATH, 'utf8') === renderDataJs(bundle);
  return { bundleOk, dataOk };
}

module.exports = {
  ROOT,
  CONTENT_DIR,
  MANIFEST_PATH,
  BUNDLE_PATH,
  DATA_PATH,
  ICONS,
  LANGUAGES,
  DIFFICULTIES,
  readJson,
  validatePack,
  validateManifest,
  validateContent,
  loadManifest,
  loadPacks,
  buildBundle,
  renderBundleJson,
  renderDataJs,
  writeGenerated,
  generatedIsCurrent
};

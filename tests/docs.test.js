'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const docPath = path.join(root, 'docs', 'GitLab核心知识点.md');
const readDoc = () => fs.readFileSync(docPath, 'utf8');

test('GitLab 知识文档存在且章节完整', () => {
  assert.ok(fs.existsSync(docPath), '缺少 docs/GitLab核心知识点.md');
  assert.ok(fs.statSync(docPath).size > 10_000, '文档内容过少');

  const doc = readDoc();
  const headings = [
    '# GitLab SRE / DevOps 核心知识点',
    '## 一、Git 基础核心',
    '## 二、GitLab 基础概念',
    '## 三、GitLab 权限体系',
    '## 四、GitLab CI/CD 核心',
    '## 五、GitLab Runner',
    '## 六、运维与安全',
    '## 七、考前速记与自测清单'
  ];
  for (const heading of headings) {
    assert.ok(doc.includes(heading), `缺少标题：${heading}`);
  }
});

test('GitLab 知识文档包含易混概念对比表', () => {
  const doc = readDoc();
  const tables = [
    '| 维度 | **Merge** | **Rebase** |',
    '| 维度 | **Cache** | **Artifacts** |',
    '| 能力 | Guest | Reporter | Developer | Maintainer | Owner |',
    '| 维度 | `only/except` | `rules` |'
  ];
  for (const table of tables) {
    assert.ok(doc.includes(table), `缺少对比表：${table}`);
  }
});

test('GitLab 知识文档覆盖核心关键字与运维命令', () => {
  const doc = readDoc();
  const keywords = [
    'stages',
    'script',
    'only/except',
    'rules',
    'cache',
    'artifacts',
    'needs',
    'gitlab-backup create',
    'gitlab-backup restore',
    'gitlab-ctl reconfigure',
    'gitlab-ctl tail',
    'X-Gitlab-Token',
    'glrt-',
    'Docker Executor'
  ];
  for (const keyword of keywords) {
    assert.ok(doc.includes(keyword), `缺少知识点：${keyword}`);
  }
});

test('每个大知识点后都附有真题与解析', () => {
  const doc = readDoc();
  const questionSections = doc.match(/^### 真题$/gm) || [];
  const explanations = doc.match(/\*\*解析\*\*/g) || [];
  assert.ok(questionSections.length >= 6, `真题小节不足：${questionSections.length}`);
  assert.ok(explanations.length >= 12, `真题解析不足：${explanations.length}`);
});

test('README 链接了 GitLab 知识文档', () => {
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  assert.match(readme, /docs\/GitLab核心知识点\.md/);
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', 'demo');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('Demo 关键文件齐全且非空', () => {
  const files = [
    'index.html',
    'css/styles.css',
    'js/data.js',
    'js/quiz-core.js',
    'js/app.js',
    'README.md',
  ];
  for (const file of files) {
    const fullPath = path.join(root, file);
    assert.ok(fs.existsSync(fullPath), `缺少文件 demo/${file}`);
    assert.ok(fs.statSync(fullPath).size > 0, `demo/${file} 为空`);
  }
});

test('index.html 使用中文与移动端视口', () => {
  const html = read('index.html');
  assert.match(html, /<html[^>]+lang=["']zh-CN["']/i);
  assert.match(html, /<meta[^>]+name=["']viewport["']/i);
  assert.match(html, /<title>[^<]*起点编程[^<]*<\/title>/);
});

test('脚本按依赖顺序以传统方式加载', () => {
  const html = read('index.html');
  const dataIndex = html.indexOf('js/data.js');
  const coreIndex = html.indexOf('js/quiz-core.js');
  const appIndex = html.indexOf('js/app.js');

  assert.ok(dataIndex > -1, 'index.html 未引入 js/data.js');
  assert.ok(coreIndex > -1, 'index.html 未引入 js/quiz-core.js');
  assert.ok(appIndex > -1, 'index.html 未引入 js/app.js');
  assert.ok(dataIndex < coreIndex && coreIndex < appIndex, '脚本加载顺序应为 data → quiz-core → app');
  assert.doesNotMatch(html, /<script[^>]+type=["']module["']/i, 'file:// 模式下不应使用 ES Module');
});

test('页面资源不依赖外部网络', () => {
  const html = read('index.html');
  const css = read('css/styles.css');
  const app = read('js/app.js');

  assert.doesNotMatch(html, /<(?:script|link|img)[^>]+(?:src|href)=["']https?:\/\//i);
  assert.doesNotMatch(html, /@import\s+url\(\s*["']?https?:/i);
  assert.doesNotMatch(css, /@import\s+url\(\s*["']?https?:/i);
  assert.doesNotMatch(css, /url\(\s*["']?https?:\/\//i);
  assert.doesNotMatch(app, /\bfetch\s*\(/);
  assert.doesNotMatch(app, /XMLHttpRequest/);
});

test('应用实现了三条 hash 路由', () => {
  const app = read('js/app.js');
  assert.match(app, /#\/topic\//);
  assert.match(app, /#\/quiz\//);
  assert.match(app, /addEventListener\(\s*['"]hashchange['"]/);
});

test('使用约定的本地进度存储键', () => {
  const app = read('js/app.js');
  assert.match(app, /devstart:progress:v1/);
});

test('README 写明了本地运行方式', () => {
  const readme = read('README.md');
  assert.match(readme, /index\.html/i);
  assert.match(readme, /http\.server|localhost/i);
});

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
    'README.md',
    'css/styles.css',
    'js/data.js',
    'js/quiz-core.js',
    'js/content-loader.js',
    'js/progress-core.js',
    'js/app.js',
    'content/SCHEMA.md',
    'content/manifest.json'
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
  const order = ['js/data.js', 'js/quiz-core.js', 'js/content-loader.js', 'js/progress-core.js', 'js/app.js'];
  const indexes = order.map((file) => html.indexOf(file));
  indexes.forEach((index, i) => assert.ok(index > -1, `index.html 未引入 ${order[i]}`));
  for (let i = 1; i < indexes.length; i++) {
    assert.ok(indexes[i - 1] < indexes[i], `脚本加载顺序错误：${order[i - 1]} 应在 ${order[i]} 之前`);
  }
  assert.doesNotMatch(html, /<script[^>]+type=["']module["']/i, 'file:// 模式下不应使用 ES Module');
});

test('页面资源不依赖外部网络', () => {
  const html = read('index.html');
  const css = read('css/styles.css');
  const app = read('js/app.js');
  const loader = read('js/content-loader.js');

  assert.doesNotMatch(html, /<(?:script|link|img)[^>]+(?:src|href)=["']https?:\/\//i);
  assert.doesNotMatch(css, /@import\s+url\(\s*["']?https?:/i);
  assert.doesNotMatch(css, /url\(\s*["']?https?:\/\//i);
  assert.doesNotMatch(app, /XMLHttpRequest/);
  assert.doesNotMatch(loader, /XMLHttpRequest/);
  assert.match(loader, /content\/bundle\.json/);
});

test('应用实现了首页、课程、错题本与刷题路由', () => {
  const app = read('js/app.js');
  assert.match(app, /#\/topic\//);
  assert.match(app, /#\/quiz\//);
  assert.match(app, /#\/review/);
  assert.match(app, /addEventListener\(\s*['"]hashchange['"]/);
  assert.match(app, /mode/);
});

test('使用 v2 进度存储并兼容迁移 v1', () => {
  const app = read('js/app.js');
  assert.match(app, /ProgressCore\.KEY/);
  assert.match(app, /devstart:progress:v1/);
  assert.match(app, /migrateProgress|normalizeProgress/);
});

test('加载最新题库并展示内容版本', () => {
  const app = read('js/app.js');
  assert.match(app, /ContentLoader\.loadContent/);
  assert.match(app, /contentVersion/);
  assert.match(app, /dataset\.contentVersion/);
});

test('README 写明了本地运行、内容更新与测试方式', () => {
  const readme = read('README.md');
  assert.match(readme, /index\.html/i);
  assert.match(readme, /http\.server|localhost/i);
  assert.match(readme, /build-content|内容更新/i);
  assert.match(readme, /node --test/);
});

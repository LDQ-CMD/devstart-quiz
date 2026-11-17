'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ContentLoader = require(path.join(__dirname, '..', 'demo', 'js', 'content-loader.js'));

function makeBundle(version) {
  return {
    schemaVersion: 2,
    contentVersion: version,
    releasedAt: '2026-11-17',
    notes: ['test'],
    topics: [
      {
        id: 'python',
        title: 'Python',
        cards: [],
        questions: [{ id: 'python-001', options: ['a', 'b', 'c', 'd'], answerIndex: 0 }]
      }
    ]
  };
}

function response(body, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    json: async () => body
  };
}

test('HTTP 成功时优先使用远程题库', async () => {
  const bundled = makeBundle('2.0.0');
  const remote = makeBundle('2.1.0');
  const result = await ContentLoader.loadContent({
    bundled,
    url: 'content/bundle.json',
    fetchImpl: async () => response(remote)
  });
  assert.equal(result.source, 'remote');
  assert.equal(result.data.contentVersion, '2.1.0');
  assert.equal(result.error, null);
});

test('file:// 或显式关闭远程时使用内置题库且不发起请求', async () => {
  const bundled = makeBundle('2.0.0');
  let calls = 0;
  const result = await ContentLoader.loadContent({
    bundled,
    useRemote: false,
    fetchImpl: async () => {
      calls += 1;
      return response(makeBundle('9.9.9'));
    }
  });
  assert.equal(calls, 0);
  assert.equal(result.source, 'bundled');
  assert.equal(result.data.contentVersion, '2.0.0');
});

test('远程请求失败时回退到内置题库', async () => {
  const bundled = makeBundle('2.0.0');
  const result = await ContentLoader.loadContent({
    bundled,
    fetchImpl: async () => {
      throw new Error('offline');
    }
  });
  assert.equal(result.source, 'bundled');
  assert.equal(result.data.contentVersion, '2.0.0');
  assert.match(result.error, /offline/);
});

test('HTTP 404 时回退并保留错误', async () => {
  const bundled = makeBundle('2.0.0');
  const result = await ContentLoader.loadContent({
    bundled,
    fetchImpl: async () => response(null, { ok: false, status: 404 })
  });
  assert.equal(result.source, 'bundled');
  assert.match(result.error, /404/);
});

test('远程数据格式不合法时回退', async () => {
  const bundled = makeBundle('2.0.0');
  const result = await ContentLoader.loadContent({
    bundled,
    fetchImpl: async () => response({ schemaVersion: 2, contentVersion: '3.0.0', topics: [] })
  });
  assert.equal(result.source, 'bundled');
  assert.match(result.error, /不合法/);
});

test('远程版本比内置旧时拒绝降级', async () => {
  const bundled = makeBundle('2.2.0');
  const result = await ContentLoader.loadContent({
    bundled,
    fetchImpl: async () => response(makeBundle('2.1.0'))
  });
  assert.equal(result.source, 'bundled');
  assert.match(result.error, /较旧/);
});

test('版本比较符合语义化规则', () => {
  assert.equal(ContentLoader.compareVersions('2.0.0', '2.0.0'), 0);
  assert.equal(ContentLoader.compareVersions('2.1.0', '2.0.9'), 1);
  assert.equal(ContentLoader.compareVersions('1.9.9', '2.0.0'), -1);
  assert.equal(ContentLoader.compareVersions('bad', '2.0.0'), 0);
});

test('isValidBundle 拒绝缺少题目字段的数据', () => {
  const bad = makeBundle('2.0.0');
  bad.topics[0].questions[0].answerIndex = 9;
  assert.equal(ContentLoader.isValidBundle(bad), false);
  assert.equal(ContentLoader.isValidBundle(makeBundle('2.0.0')), true);
});

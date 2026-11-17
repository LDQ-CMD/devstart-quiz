/*
 * 起点编程 DevStart — 题库加载
 * UMD：浏览器 window.ContentLoader / Node module.exports。
 * HTTP 下优先读取最新 bundle.json；file:// 或失败时回退到内置题库。
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module !== null && typeof module.exports === "object") {
    module.exports = api;
  }
  if (root && typeof root === "object") {
    root.ContentLoader = api;
  }
}(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
  }

  function parseVersion(version) {
    if (typeof version !== "string") return null;
    var parts = version.split(".");
    if (parts.length !== 3) return null;
    var numbers = [];
    for (var i = 0; i < parts.length; i++) {
      if (!/^\d+$/.test(parts[i])) return null;
      numbers.push(Number(parts[i]));
    }
    return numbers;
  }

  function compareVersions(a, b) {
    var left = parseVersion(a);
    var right = parseVersion(b);
    if (!left || !right) return 0;
    for (var i = 0; i < 3; i++) {
      if (left[i] !== right[i]) return left[i] > right[i] ? 1 : -1;
    }
    return 0;
  }

  function isValidBundle(data) {
    if (!isObject(data)) return false;
    if (data.schemaVersion !== 2) return false;
    if (!isNonEmptyString(data.contentVersion)) return false;
    if (!Array.isArray(data.topics) || data.topics.length === 0) return false;
    for (var i = 0; i < data.topics.length; i++) {
      var topic = data.topics[i];
      if (!isObject(topic) || !isNonEmptyString(topic.id) || !isNonEmptyString(topic.title)) return false;
      if (!Array.isArray(topic.cards) || !Array.isArray(topic.questions)) return false;
      for (var j = 0; j < topic.questions.length; j++) {
        var question = topic.questions[j];
        if (!isObject(question) || !isNonEmptyString(question.id) || !Array.isArray(question.options)) return false;
        if (question.options.length !== 4) return false;
        if (!Number.isInteger(question.answerIndex) || question.answerIndex < 0 || question.answerIndex > 3) return false;
      }
    }
    return true;
  }

  /**
   * loadContent({ bundled, fetchImpl, url, useRemote })
   * 返回 Promise<{ data, source: "remote"|"bundled", error: string|null }>
   */
  function loadContent(options) {
    var settings = options || {};
    var bundled = settings.bundled;
    var fetchImpl = settings.fetchImpl || (typeof fetch === "function" ? fetch : null);
    var useRemote = settings.useRemote !== false;
    var url = settings.url || "content/bundle.json";

    if (!useRemote || typeof fetchImpl !== "function") {
      return Promise.resolve({ data: bundled, source: "bundled", error: null });
    }

    return Promise.resolve()
      .then(function () {
        return fetchImpl(url, { cache: "no-store" });
      })
      .then(function (response) {
        if (!response || !response.ok) {
          throw new Error("HTTP " + (response ? response.status : "error"));
        }
        return response.json();
      })
      .then(function (remote) {
        if (!isValidBundle(remote)) throw new Error("题库数据格式不合法");
        if (isValidBundle(bundled) && compareVersions(remote.contentVersion, bundled.contentVersion) < 0) {
          return { data: bundled, source: "bundled", error: "远程题库版本较旧" };
        }
        return { data: remote, source: "remote", error: null };
      })
      .catch(function (error) {
        return {
          data: bundled,
          source: "bundled",
          error: error && error.message ? error.message : String(error)
        };
      });
  }

  return {
    loadContent: loadContent,
    isValidBundle: isValidBundle,
    compareVersions: compareVersions
  };
}));

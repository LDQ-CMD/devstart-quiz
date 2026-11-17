/*
 * 起点编程 DevStart — 应用逻辑 v1.0
 * 纯原生 JS：hash 路由 + 渲染 + 进度持久化。网络部分只经由 ContentLoader。
 */
(function () {
  "use strict";

  var ContentLoader = window.ContentLoader || null;
  var ProgressCore = window.ProgressCore || null;
  var QuizCore = window.QuizCore;

  var app = document.getElementById("app");
  var navProgress = document.getElementById("nav-progress");
  var reviewBadge = document.getElementById("review-badge");
  var versionLabel = document.getElementById("content-version-label");
  var sourceLabel = document.getElementById("content-source-label");
  var notesDialog = document.getElementById("notes-dialog");
  var notesList = document.getElementById("notes-list");
  var notesMeta = document.getElementById("notes-meta");

  var LEGACY_KEY = "devstart:progress:v1";
  var BUNDLE_URL = "content/bundle.json";
  var LOAD_TIMEOUT_MS = 5000;
  var LETTERS = ["A", "B", "C", "D", "E", "F"];

  var state = {
    data: window.LEARN_DATA || { version: 1, topics: [] },
    source: "bundled",
    loaded: false,
    progress: ProgressCore ? ProgressCore.emptyProgress() : { version: 2, questions: {}, topics: {}, meta: {} }
  };

  var session = null; // { items:[{topicId,topicTitle,question}], index, answers, locked, mode, topicId, backHref, beforeMasteryPct }

  /* ------------------------- 内联 SVG 图标 ------------------------- */
  var ICONS = {
    python:
      '<path d="M18 6.5A2.5 2.5 0 0 0 15.5 4h-7a2.5 2.5 0 0 0 0 5h7a2.5 2.5 0 0 1 0 5h-7A2.5 2.5 0 0 0 6 16.5"/><circle cx="17" cy="6.5" r="1" fill="currentColor" stroke="none"/><circle cx="7" cy="17" r="1" fill="currentColor" stroke="none"/>',
    docker:
      '<rect x="4" y="12" width="4.5" height="4.5" rx="0.8"/><rect x="9.7" y="12" width="4.5" height="4.5" rx="0.8"/><rect x="9.7" y="6.4" width="4.5" height="4.5" rx="0.8"/><rect x="15.4" y="12" width="4.5" height="4.5" rx="0.8"/><path d="M2.5 19c4.5 2.6 12.5 2.4 17.5-2"/>',
    k8s:
      '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.6"/><path d="M12 4v5.4M4.9 16.1l4.8-2.8M19.1 16.1l-4.8-2.8"/>',
    linux:
      '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M7 9.5l3.5 3L7 15.5M12.5 16H17"/>',
    git:
      '<circle cx="7" cy="6" r="2.2"/><circle cx="7" cy="18" r="2.2"/><circle cx="17" cy="11" r="2.2"/><path d="M7 8.2v7.6M9.2 5.4h5.8a2 2 0 0 1 2 2v1.5"/>',
    network:
      '<circle cx="12" cy="5" r="2.2"/><circle cx="5" cy="18" r="2.2"/><circle cx="19" cy="18" r="2.2"/><path d="M11 7l-5 9M13 7l5 9M7.2 18h9.6"/>',
    sql:
      '<ellipse cx="12" cy="6" rx="7.5" ry="3"/><path d="M4.5 6v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6"/><path d="M4.5 12v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6"/>',
    structure:
      '<circle cx="12" cy="5" r="2.2"/><circle cx="5.5" cy="18.5" r="2.2"/><circle cx="18.5" cy="18.5" r="2.2"/><path d="M12 7.2v4.3M12 11.5l-5.2 5.2M12 11.5l5.2 5.2"/>',
    back:
      '<path d="M14.5 5.5L8 12l6.5 6.5"/>',
    arrow:
      '<path d="M4 12h15M13.5 6.5L20 12l-6.5 5.5"/>',
    check:
      '<path d="M4.5 12.5l5 5L19.5 7"/>',
    cross:
      '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    refresh:
      '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 3.5v3.8h3.8"/>',
    book:
      '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20"/>',
    target:
      '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>',
    warn:
      '<path d="M12 3.5L21.5 20h-19z"/><path d="M12 10v4.5"/><circle cx="12" cy="17.4" r="0.9" fill="currentColor" stroke="none"/>',
    note:
      '<path d="M6 3.5h9.5L20 8v12.5H6z"/><path d="M15 3.5V8.5H20M9.5 12h7M9.5 16h5"/>'
  };

  function icon(name, size) {
    return '<svg viewBox="0 0 24 24" width="' + (size || 22) + '" height="' + (size || 22) +
      '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (ICONS[name] || ICONS.note) + "</svg>";
  }

  /* ------------------------- 工具 ------------------------- */
  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function safeParse(raw) {
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  function getTopics() {
    return state.data && Array.isArray(state.data.topics) ? state.data.topics : [];
  }

  function getTopic(id) {
    var topics = getTopics();
    for (var i = 0; i < topics.length; i++) {
      if (topics[i].id === id) return topics[i];
    }
    return null;
  }

  function totalQuestions() {
    return getTopics().reduce(function (sum, t) {
      return sum + (Array.isArray(t.questions) ? t.questions.length : 0);
    }, 0);
  }

  function contentVersion() {
    return state.data && state.data.contentVersion ? String(state.data.contentVersion) : "1";
  }

  /* ------------------------- 进度（委托 ProgressCore） ------------------------- */
  function persistProgress() {
    try {
      localStorage.setItem(ProgressCore.KEY, JSON.stringify(state.progress));
    } catch (e) { /* 隐私模式等场景下静默失败 */ }
  }

  /** 优先读 v2；缺失时读取旧版 v1 并迁移保存。 */
  function initProgress() {
    var stored = null;
    try { stored = localStorage.getItem(ProgressCore.KEY); } catch (e) { /* 忽略 */ }
    if (stored) {
      state.progress = ProgressCore.normalizeProgress(safeParse(stored));
      return;
    }
    var legacy = null;
    try { legacy = localStorage.getItem(LEGACY_KEY); } catch (e) { /* 忽略 */ }
    if (legacy) {
      state.progress = ProgressCore.migrateProgress(safeParse(legacy));
      persistProgress(); // 迁移结果写入 v2（v1 保留为备份）
    }
  }

  function clearAllProgress() {
    state.progress = ProgressCore.emptyProgress();
    try {
      localStorage.removeItem(ProgressCore.KEY);
      localStorage.removeItem(LEGACY_KEY);
    } catch (e) { /* 忽略 */ }
    updateNavProgress();
  }

  function topicMasteryOf(topic) {
    return ProgressCore.topicMastery(state.progress, topic);
  }

  /** 熟练度画像：综合正确率、连对、次数与间隔，并给出薄弱知识点。 */
  function topicProficiencyOf(topic) {
    if (!ProgressCore || typeof ProgressCore.topicProficiency !== "function") return null;
    return ProgressCore.topicProficiency(state.progress, topic);
  }

  function updateNavProgress() {
    var topics = getTopics();
    var done = topics.filter(function (t) {
      var s = ProgressCore.topicStat(state.progress, t.id);
      return s && s.attempts > 0;
    }).length;
    if (navProgress) navProgress.textContent = "进度 " + done + "/" + topics.length;
    if (reviewBadge) {
      var count = ProgressCore.reviewCount(topics, state.progress);
      reviewBadge.hidden = count === 0;
      reviewBadge.textContent = count > 99 ? "99+" : String(count);
    }
  }

  /* ------------------------- 启动与题库加载 ------------------------- */
  function renderLoading() {
    app.innerHTML =
      '<div class="loading-view" role="status" aria-live="polite">' +
        '<span class="loading-dot" aria-hidden="true"></span><span>题库加载中…</span>' +
      "</div>";
  }

  function sanitizeData(raw) {
    var data = raw && typeof raw === "object" && Array.isArray(raw.topics) ? raw : { topics: [] };
    data.topics = data.topics.filter(function (t) {
      return t && typeof t.id === "string" && Array.isArray(t.questions);
    });
    data.topics.forEach(function (t) {
      if (!Array.isArray(t.cards)) t.cards = [];
      if (!t.title) t.title = t.id;
    });
    return data;
  }

  function applyContent(result) {
    state.data = sanitizeData(result.data);
    state.source = result.source === "remote" ? "remote" : "bundled";
    state.loaded = true;

    document.documentElement.dataset.contentVersion = contentVersion();
    document.documentElement.dataset.contentSource = state.source;
    renderVersionFooter();

    if (state.source === "remote") {
      showToast("题库已更新至 v" + contentVersion());
    }
    updateNavProgress();
    render();
  }

  function boot() {
    renderLoading();
    if (ProgressCore) initProgress();
    updateNavProgress();

    var useRemote = !!ContentLoader && location.protocol !== "file:";
    if (!useRemote) {
      applyContent({ data: window.LEARN_DATA, source: "bundled", error: null });
      return;
    }

    var settled = false;
    var load = ContentLoader.loadContent({
      bundled: window.LEARN_DATA,
      useRemote: true,
      url: BUNDLE_URL
    });
    // 超时保护：绝不长时间阻塞渲染
    var timeout = new Promise(function (resolve) {
      setTimeout(function () {
        resolve({ data: window.LEARN_DATA, source: "bundled", error: "timeout" });
      }, LOAD_TIMEOUT_MS);
    });

    Promise.race([load, timeout]).then(function (result) {
      if (settled) return;
      settled = true;
      applyContent(result);
    });
    load.catch(function () { /* loadContent 已内部兜底，这里仅防未处理拒绝 */ });
  }

  /* ------------------------- 页脚版本 / 更新说明 ------------------------- */
  function renderVersionFooter() {
    if (!versionLabel || !sourceLabel) return;
    versionLabel.textContent = "题库 v" + contentVersion() +
      (state.data && state.data.releasedAt ? " · " + state.data.releasedAt : "");
    sourceLabel.textContent = state.source === "remote" ? "在线题库" : "内置题库";
  }

  function openNotesDialog() {
    var notes = state.data && Array.isArray(state.data.notes) ? state.data.notes : [];
    if (notesMeta) {
      notesMeta.textContent = "当前版本 v" + contentVersion() +
        (state.data && state.data.releasedAt ? "（" + state.data.releasedAt + "）" : "") +
        " · 来源：" + (state.source === "remote" ? "在线题库" : "内置题库");
    }
    if (notesList) {
      notesList.innerHTML = notes.length
        ? notes.map(function (n) { return "<li>" + esc(n) + "</li>"; }).join("")
        : "<li>当前为内置题库，暂无更新说明。</li>";
    }
    if (typeof notesDialog.showModal === "function") notesDialog.showModal();
    else notesDialog.setAttribute("open", "");
  }

  function wireDialog() {
    var openBtn = document.getElementById("update-notes");
    var closeBtn = document.getElementById("notes-close");
    if (openBtn) openBtn.addEventListener("click", openNotesDialog);
    if (closeBtn) closeBtn.addEventListener("click", function () { notesDialog.close(); });
    if (notesDialog) {
      notesDialog.addEventListener("close", function () {
        if (openBtn) openBtn.focus(); // 焦点归还触发按钮
      });
    }
  }

  /* ------------------------- Toast ------------------------- */
  function showToast(message) {
    var host = document.body;
    if (!host) return;
    var t = document.createElement("div");
    t.className = "toast";
    t.setAttribute("role", "status");
    t.innerHTML =
      '<span class="toast-icon">' + icon("check", 15) + "</span>" +
      "<span>" + esc(message) + "</span>" +
      '<button type="button" class="toast-close" aria-label="关闭提示">✕</button>';
    function dismiss() { t.remove(); }
    t.querySelector(".toast-close").addEventListener("click", dismiss);
    host.appendChild(t);
    setTimeout(dismiss, 6000);
  }

  /* ------------------------- 通用片段 ------------------------- */
  function codeBlockHtml(code) {
    if (!code || typeof code.content !== "string" || !code.content) return "";
    var lang = typeof code.language === "string" && code.language ? code.language : "text";
    return (
      '<figure class="code-block">' +
        '<figcaption class="code-cap">' +
          '<span class="code-lang">' + esc(lang) + "</span>" +
          (code.caption ? '<span class="code-cap-text">' + esc(code.caption) + "</span>" : "") +
        "</figcaption>" +
        "<pre><code>" + esc(code.content) + "</code></pre>" +
      "</figure>"
    );
  }

  function tagsHtml(tags) {
    if (!Array.isArray(tags) || tags.length === 0) return "";
    return '<div class="q-tags" aria-label="知识点标签">' +
      tags.map(function (t) { return '<span class="tag-chip">#' + esc(t) + "</span>"; }).join("") +
      "</div>";
  }

  /* ------------------------- 视图：首页 ------------------------- */
  function topicCard(topic, i) {
    var m = topicMasteryOf(topic);
    var prof = topicProficiencyOf(topic);
    var stat = ProgressCore.topicStat(state.progress, topic.id);
    var started = m.answered > 0 || (stat && stat.attempts > 0);

    var progressHtml;
    if (started) {
      progressHtml =
        '<div class="topic-progress">' +
          "<span>熟练度 <b>" + (prof ? prof.label + " " + prof.score : "—") + "</b> · 掌握度 " + m.percent + "% · 已掌握 " + m.mastered + "/" + m.total + " 题" +
          (m.wrong > 0 ? " · 错题 " + m.wrong : "") +
          (stat && stat.attempts > 0 ? " · 最佳 " + stat.bestScore + "/" + stat.total : "") +
          "</span>" +
        "</div>" +
        '<div class="best-bar" role="progressbar" aria-label="掌握度 ' + m.percent + '%" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + m.percent + '"><i style="width:' + m.percent + '%"></i></div>';
    } else {
      progressHtml =
        '<div class="topic-progress"><span>尚未开始，刷题建立掌握度</span></div>' +
        '<div class="best-bar"><i style="width:0%"></i></div>';
    }

    return (
      '<a class="topic-card rise rise-' + ((i % 5) + 1) + '" style="--accent:' + topic.accent + '" href="#/topic/' + topic.id + '">' +
        '<div class="topic-card-top">' +
          '<span class="topic-icon">' + icon(topic.icon) + "</span>" +
          '<span class="topic-level">' + esc(topic.level || "入门") + "</span>" +
        "</div>" +
        "<h3>" + esc(topic.title) + "</h3>" +
        '<p class="topic-tagline">' + esc(topic.tagline || "") + "</p>" +
        '<div class="topic-meta">' +
          "<span>理论 <b>" + (topic.estimatedMinutes || "—") + " 分钟</b></span>" +
          "<span>题目 <b>" + (topic.questions ? topic.questions.length : 0) + " 道</b></span>" +
          "<span>知识卡 <b>" + (topic.cards ? topic.cards.length : 0) + " 张</b></span>" +
        "</div>" +
        progressHtml +
        '<span class="topic-open">进入课程 ' + icon("arrow", 15) + "</span>" +
      "</a>"
    );
  }

  function renderHome() {
    var topics = getTopics();
    var totalQ = totalQuestions();
    var reviewTotal = ProgressCore.reviewCount(topics, state.progress);
    var cards = topics.map(topicCard).join("");

    var reviewBanner = reviewTotal > 0
      ? '<a class="review-banner has-items" href="#/review">' +
          '<span class="review-banner-icon">' + icon("book", 22) + "</span>" +
          '<span class="review-banner-text"><b>错题本</b><span>有 <b>' + reviewTotal + "</b> 道错题等待重练</span></span>" +
          '<span class="review-banner-go">进入错题本 ' + icon("arrow", 15) + "</span>" +
        "</a>"
      : '<a class="review-banner" href="#/review">' +
          '<span class="review-banner-icon">' + icon("book", 22) + "</span>" +
          '<span class="review-banner-text"><b>错题本</b><span>暂无错题，先把课程刷一遍吧</span></span>' +
          '<span class="review-banner-go">查看 ' + icon("arrow", 15) + "</span>" +
        "</a>";

    app.innerHTML =
      '<section class="hero">' +
        '<p class="hero-kicker rise">零基础 · 系统训练 · 完全免费</p>' +
        '<h1 class="rise rise-1">打好编程地基，<br>从<span class="accent">基本功训练场</span>开始</h1>' +
        '<p class="hero-sub rise rise-2">起点编程把编程入门拆成 ' + topics.length + ' 个互相独立的小课：每课多张知识卡讲清概念，' + totalQ + ' 道题当场验证。看懂了再动手刷，错了立刻看解析、进错题本——像请了一位随时在场的助教。</p>' +
        '<div class="hero-actions rise rise-3">' +
          '<a class="btn btn-primary" href="#/topic/python">从 Python 开始 ' + icon("arrow", 16) + "</a>" +
          '<a class="btn btn-ghost" href="#/" data-nav data-scroll="how">了解怎么学</a>' +
        "</div>" +
        '<div class="hero-stats rise rise-4">' +
          "<div><strong>" + topics.length + "</strong><span>大主题课程</span></div>" +
          "<div><strong>" + totalQ + "</strong><span>道精选题目</span></div>" +
          '<div><strong>v' + esc(contentVersion()) + "</strong><span>题库版本 · 100% 本地运行</span></div>" +
        "</div>" +
      "</section>" +

      '<div class="rise rise-4">' + reviewBanner + "</div>" +

      '<section class="section" id="topics" aria-labelledby="topics-title">' +
        '<div class="section-head"><h2 id="topics-title">课程主题</h2><p>按推荐顺序排列，也可以按兴趣任选</p></div>' +
        '<div class="topic-grid">' + cards + "</div>" +
      "</section>" +

      '<section class="section" id="how" aria-labelledby="how-title">' +
        '<div class="section-head"><h2 id="how-title">三步学习法</h2><p>每一课都按同样的节奏推进</p></div>' +
        '<div class="how-grid">' +
          '<div class="how-step"><h3>看知识卡</h3><p>知识卡把概念拆成短句、示例代码和易错提醒，先建立正确的直觉，不背书。</p></div>' +
          '<div class="how-step"><h3>刷题验证</h3><p>逐题作答、即时判分：每道题都有逐选项解析，错在哪一步一目了然。</p></div>' +
          '<div class="how-step"><h3>错题回顾</h3><p>错题自动进错题本，连续答对两次记为掌握，针对性重练直到巩固。</p></div>' +
        "</div>" +
      "</section>";
  }

  /* ------------------------- 视图：课程详情 ------------------------- */
  function renderTopic(topic) {
    var m = topicMasteryOf(topic);
    var prof = topicProficiencyOf(topic);
    var stat = ProgressCore.topicStat(state.progress, topic.id);
    var attempts = stat ? stat.attempts : 0;
    var total = topic.questions.length;
    var wrongCount = ProgressCore.wrongQuestions([topic], state.progress).length;

    var objectivesHtml = "";
    if (Array.isArray(topic.objectives) && topic.objectives.length > 0) {
      objectivesHtml =
        '<section class="objectives rise" aria-labelledby="obj-title">' +
          '<h2 id="obj-title">' + icon("target", 18) + " 学完这课你能</h2>" +
          "<ul>" +
            topic.objectives.map(function (o) { return "<li>" + esc(o) + "</li>"; }).join("") +
          "</ul>" +
        "</section>";
    }

    var cardsHtml = (topic.cards || []).map(function (card, i) {
      var num = String(i + 1).padStart(2, "0");
      var exampleHtml = card.example ? codeBlockHtml({
        language: card.example.language,
        caption: card.example.caption,
        content: card.example.code
      }) : "";
      var pitfallsHtml = "";
      if (Array.isArray(card.pitfalls) && card.pitfalls.length > 0) {
        pitfallsHtml =
          '<div class="pitfalls">' +
            '<h3>' + icon("warn", 15) + " 新手易错</h3>" +
            "<ul>" + card.pitfalls.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ul>" +
          "</div>";
      }
      return (
        '<article class="kcard rise rise-' + ((i % 5) + 1) + '">' +
          '<p class="kcard-index">知识卡 ' + num + "</p>" +
          "<h2>" + esc(card.title) + "</h2>" +
          '<p class="summary">' + esc(card.summary) + "</p>" +
          "<ul>" + (card.points || []).map(function (pt) { return "<li>" + esc(pt) + "</li>"; }).join("") + "</ul>" +
          exampleHtml +
          pitfallsHtml +
        "</article>"
      );
    }).join("");

    var reviewControl = wrongCount > 0
      ? '<a class="btn btn-ghost btn-block btn-review" href="#/quiz/' + topic.id + '?mode=review">错题重练（' + wrongCount + " 题）</a>"
      : '<button type="button" class="btn btn-ghost btn-block" disabled>错题重练（0 题）</button>' +
        '<p class="side-note mode-hint">暂无错题需要重练，保持！</p>';

    app.innerHTML =
      '<nav class="breadcrumb" aria-label="面包屑">' +
        '<a href="#/">首页</a><span class="sep">/</span><span>' + esc(topic.title) + "</span>" +
      "</nav>" +

      '<section class="topic-hero">' +
        '<span class="topic-icon" style="--accent:' + topic.accent + '">' + icon(topic.icon, 30) + "</span>" +
        "<div>" +
          "<h1>" + esc(topic.title) + "</h1>" +
          '<p class="tagline">' + esc(topic.tagline || "") + "</p>" +
          '<p class="desc">' + esc(topic.description || "") + "</p>" +
          '<div class="topic-hero-meta">' +
            "<span>难度 <b>" + esc(topic.level || "入门") + "</b></span>" +
            "<span>理论阅读约 <b>" + (topic.estimatedMinutes || "—") + " 分钟</b></span>" +
            "<span>配套习题 <b>" + total + " 道</b></span>" +
          "</div>" +
        "</div>" +
      "</section>" +

      '<div class="topic-layout">' +
        '<div class="card-seq" aria-label="知识卡列表">' + objectivesHtml + cardsHtml + "</div>" +

        '<aside class="side-panel" aria-label="课程进度与练习入口">' +
          "<h2>学习进度</h2>" +
          '<div class="side-mastery">' +
            '<div class="side-mastery-head"><span>熟练度 · 掌握度</span><b>' +
            (prof ? prof.label + " " + prof.score : "—") + " · " + m.percent + "%</b></div>" +
            '<div class="best-bar" role="progressbar" aria-label="熟练度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + (prof ? prof.score : 0) + '"><i style="width:' + (prof ? prof.score : 0) + '%"></i></div>' +
            '<p class="side-note">' + (prof ? prof.desc + "。" : "") + "已掌握 " + m.mastered + "/" + m.total + " 题 · 连续答对 2 次记为掌握" +
              (m.wrong > 0 ? " · 待重练 " + m.wrong + " 题" : "") +
              (m.answered > 0 ? " · 已作答 " + m.answered + " 题" : "") + "</p>" +
            (prof && prof.weakPoints.length > 0
              ? '<p class="side-note">薄弱知识点：' + prof.weakPoints.map(function (wp) { return "#" + esc(wp.tag); }).join(" · ") + "</p>"
              : "") +
          "</div>" +
          '<div class="side-stat"><span>最佳成绩</span><b>' + (stat && stat.attempts > 0 ? stat.bestScore + " / " + stat.total : "—") + "</b></div>" +
          '<div class="side-stat"><span>练习次数</span><b>' + attempts + "</b></div>" +
          '<div class="mode-stack">' +
            '<a class="btn btn-primary btn-block" href="#/quiz/' + topic.id + '?mode=quick">快速练习（8 题）' + icon("arrow", 16) + "</a>" +
            '<a class="btn btn-ghost btn-block" href="#/quiz/' + topic.id + '?mode=all">全部题目（' + total + " 题）</a>" +
            reviewControl +
          "</div>" +
          '<p class="side-note">快速练习会优先挑选错题与久未作答的题目。</p>' +
        "</aside>" +
      "</div>";
  }

  /* ------------------------- 视图：错题本 ------------------------- */
  function renderReview() {
    var topics = getTopics();
    var rows = ProgressCore.reviewSummary(topics, state.progress);
    var total = rows.reduce(function (sum, r) { return sum + r.count; }, 0);

    var body;
    if (total === 0) {
      body =
        '<div class="empty-state">' +
          icon("check", 34) +
          "<h2>太棒了，错题本是空的</h2>" +
          "<p>刷题时答错的题会自动收集到这里，方便你集中回炉重练。</p>" +
          '<a class="btn btn-primary" href="#/">去逛逛课程</a>' +
        "</div>";
    } else {
      body =
        '<div class="review-page-list" role="list">' +
          rows.map(function (r) {
            return (
              '<div class="review-row" role="listitem">' +
                '<span class="review-row-title">' + esc(r.title) + "</span>" +
                '<span class="review-row-count">' + r.count + " 道错题</span>" +
                '<a class="btn btn-ghost btn-sm" href="#/quiz/' + r.topicId + '?mode=review">重练本课</a>' +
              "</div>"
            );
          }).join("") +
        "</div>" +
        '<div class="review-page-actions">' +
          '<a class="btn btn-primary" href="#/quiz/all?mode=review">全部错题重练（' + total + " 题）" + icon("arrow", 16) + "</a>" +
          '<a class="btn btn-ghost" href="#/">返回首页</a>' +
        "</div>";
    }

    app.innerHTML =
      '<nav class="breadcrumb" aria-label="面包屑">' +
        '<a href="#/">首页</a><span class="sep">/</span><span>错题本</span>' +
      "</nav>" +
      '<section class="review-page">' +
        '<header class="review-page-head rise">' +
          "<h1>" + icon("book", 26) + " 错题本</h1>" +
          "<p>" + (total > 0 ? "共 " + total + " 道题最近一次作答有误，重练答对后会自动移出。" : "当前没有错题。") + "</p>" +
        "</header>" +
        body +
      "</section>";
  }

  /* ------------------------- 视图：刷题 ------------------------- */
  function pickFor(topic, mode) {
    var progress = state.progress;
    if (mode === "review") return ProgressCore.pickQuestions(topic.questions, progress, "review");
    if (mode === "all") return ProgressCore.pickQuestions(topic.questions, progress, "all");
    return ProgressCore.pickQuestions(topic.questions, progress, "quick", 8);
  }

  function buildSession(topicId, mode) {
    var items = [];
    var topic = null;

    if (topicId === "all") {
      getTopics().forEach(function (t) {
        pickFor(t, mode).forEach(function (q) {
          items.push({ topicId: t.id, topicTitle: t.title, question: q });
        });
      });
    } else {
      topic = getTopic(topicId);
      if (!topic) return null;
      pickFor(topic, mode).forEach(function (q) {
        items.push({ topicId: topic.id, topicTitle: topic.title, question: q });
      });
    }

    var backHref = topic
      ? "#/topic/" + topic.id
      : (mode === "review" ? "#/review" : "#/");

    return {
      topicId: topicId,
      mode: mode,
      items: items,
      index: 0,
      answers: items.map(function () { return null; }),
      locked: items.map(function () { return false; }),
      backHref: backHref,
      singleTopic: !!topic,
      topic: topic,
      beforeMasteryPct: topic ? topicMasteryOf(topic).percent : null
    };
  }

  function scoreSoFar() {
    var correct = 0, locked = 0;
    for (var i = 0; i < session.items.length; i++) {
      if (session.locked[i]) {
        locked++;
        if (session.answers[i] === session.items[i].question.answerIndex) correct++;
      }
    }
    return { correct: correct, locked: locked };
  }

  function quizHeader() {
    var item = session.items[session.index];
    var total = session.items.length;
    var pct = total > 0 ? Math.round((session.index / total) * 100) : 0;
    var backLabel = session.mode === "review" ? "返回错题本" : (session.singleTopic ? "返回课程" : "返回首页");

    return (
      '<div class="quiz-topbar">' +
        '<a class="back-link" href="' + session.backHref + '">' + icon("back", 15) + " " + backLabel + "</a>" +
        '<span class="quiz-topic">' + esc(item.topicTitle) +
          (session.mode === "review" ? ' <span class="mode-chip">错题重练</span>' : "") +
        "</span>" +
        '<span class="quiz-counter" id="quiz-counter">第 ' + (session.index + 1) + " 题 / 共 " + total + " 题</span>" +
      "</div>" +
      '<div class="quiz-bar" role="progressbar" aria-label="答题进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><i style="width:' + pct + '%"></i></div>' +
      '<p class="quiz-hint">键盘可用：<kbd>1</kbd>–<kbd>4</kbd> 选择选项，<kbd>Enter</kbd> 提交 / 下一题</p>'
    );
  }

  function optionHtml(q, i, selected, locked) {
    var cls = ["option"];
    var flag = "";
    var isAnswer = i === q.answerIndex;
    var isPicked = selected === i;
    var note = locked && Array.isArray(q.optionNotes) && q.optionNotes[i]
      ? '<span class="option-note">' + icon("note", 13) + esc(q.optionNotes[i]) + "</span>"
      : "";

    if (locked) {
      if (isAnswer) {
        cls.push("correct");
        flag = '<span class="option-flag">' + icon("check", 13) + " 正确答案</span>";
      } else if (isPicked) {
        cls.push("wrong");
        flag = '<span class="option-flag">' + icon("cross", 13) + " 你的选择 · 错误</span>";
      } else {
        cls.push("dim");
      }
    } else if (isPicked) {
      cls.push("selected");
    }

    return (
      '<button type="button" class="' + cls.join(" ") + '" data-option="' + i + '"' +
        (locked ? " disabled" : "") +
        ' aria-pressed="' + (isPicked && !locked ? "true" : "false") + '">' +
        '<span class="option-key" aria-hidden="true">' + LETTERS[i] + "</span>" +
        '<span class="option-text">' + esc(q.options[i]) + note + "</span>" +
        flag +
      "</button>"
    );
  }

  function renderQuestion() {
    var item = session.items[session.index];
    var q = item.question;
    var total = session.items.length;
    var selected = session.answers[session.index];
    var locked = session.locked[session.index];
    var isLast = session.index === total - 1;
    var soc = scoreSoFar();

    var opts = q.options.map(function (_, i) {
      return optionHtml(q, i, selected, locked);
    }).join("");

    var feedback = "";
    if (locked) {
      var isCorrect = selected === q.answerIndex;
      feedback =
        '<div class="feedback ' + (isCorrect ? "ok" : "no") + '" role="status" aria-live="polite" id="quiz-feedback">' +
          '<span class="feedback-verdict">' +
            icon(isCorrect ? "check" : "cross", 16) +
            (isCorrect ? "回答正确！" : "答错了，正确答案是 " + LETTERS[q.answerIndex] + "。") +
          "</span>" +
          '<p class="feedback-exp"><b>解析：</b>' + esc(q.explanation || "") + "</p>" +
          tagsHtml(q.tags) +
        "</div>";
    }

    var primaryBtn;
    if (!locked) {
      primaryBtn = '<button type="button" class="btn btn-primary" id="quiz-primary" disabled>提交答案</button>';
    } else if (isLast) {
      primaryBtn = '<button type="button" class="btn btn-primary" id="quiz-primary">查看结果 ' + icon("arrow", 16) + "</button>";
    } else {
      primaryBtn = '<button type="button" class="btn btn-primary" id="quiz-primary">下一题 ' + icon("arrow", 16) + "</button>";
    }

    app.innerHTML =
      '<div class="quiz-layout" style="--topic-accent:' + (getTopic(item.topicId) ? getTopic(item.topicId).accent : "#0c6b58") + '">' +
        quizHeader() +
        '<article class="quiz-card" aria-labelledby="q-text">' +
          '<div class="q-head">' +
            '<span class="q-num">' + esc(q.id || "Q" + (session.index + 1)) + "</span>" +
            '<span class="q-diff diff-' + esc(q.difficulty || "基础") + '">' + esc(q.difficulty || "基础") + "</span>" +
            "<span>" + esc(item.topicTitle) + "</span>" +
          "</div>" +
          '<h1 class="q-text" id="q-text">' + esc(q.question) + "</h1>" +
          codeBlockHtml(q.code) +
          '<div class="options" role="group" aria-label="选项（单选）">' + opts + "</div>" +
          feedback +
          '<div class="quiz-foot">' +
            '<span class="quiz-score-so-far" id="quiz-score">当前已判 ' + soc.locked + " 题 · 答对 " + soc.correct + " 题</span>" +
            '<span class="spacer"></span>' +
            primaryBtn +
          "</div>" +
        "</article>" +
      "</div>";

    wireQuizCard(q);
  }

  function wireQuizCard(q) {
    var buttons = app.querySelectorAll("[data-option]");
    var primary = document.getElementById("quiz-primary");

    Array.prototype.forEach.call(buttons, function (btn) {
      btn.addEventListener("click", function () {
        if (session.locked[session.index]) return;
        var idx = Number(btn.getAttribute("data-option"));
        session.answers[session.index] = idx;
        Array.prototype.forEach.call(buttons, function (b) {
          b.classList.toggle("selected", b === btn && !session.locked[session.index]);
          b.setAttribute("aria-pressed", b === btn ? "true" : "false");
        });
        if (primary) primary.disabled = false;
      });
    });

    if (primary) {
      primary.addEventListener("click", function () {
        var total = session.items.length;
        if (!session.locked[session.index]) {
          if (session.answers[session.index] == null) return;
          session.locked[session.index] = true;
          // 逐题统计入库（含 file:// 场景）
          state.progress = ProgressCore.recordAnswer(state.progress, q, session.answers[session.index]);
          persistProgress();
          updateNavProgress();
          renderQuestion();
          var nextPrimary = document.getElementById("quiz-primary");
          if (nextPrimary) nextPrimary.focus();
        } else if (session.index < total - 1) {
          session.index++;
          renderQuestion();
        } else {
          renderResults();
        }
      });
    }
  }

  function renderQuizEmpty() {
    var reviewish = session.mode === "review";
    app.innerHTML =
      '<div class="quiz-layout">' +
        '<div class="empty-state quiz-empty">' +
          icon(reviewish ? "check" : "book", 34) +
          "<h2>" + (reviewish ? "没有需要重练的错题" : "没有可练习的题目") + "</h2>" +
          "<p>" + (reviewish
            ? "这个范围里最近一次作答全部正确，先去学新内容，之后再来保持手感。"
            : "当前题库在这个范围内没有题目。") + "</p>" +
          '<div class="results-actions">' +
            (reviewish ? '<a class="btn btn-primary" href="#/review">返回错题本</a>' : "") +
            '<a class="btn btn-ghost" href="#/">返回首页</a>' +
          "</div>" +
        "</div>" +
      "</div>";
  }

  /* ------------------------- 视图：结果 ------------------------- */
  function bandMessage(pct) {
    if (pct < 60) return { title: "再巩固一下", msg: "别灰心——把错题解析读一遍，再回到知识卡里找对应的概念，很快就能补齐。" };
    if (pct < 85) return { title: "不错，已入门", msg: "基础已经立住了！回看下面的错题，把模糊的概念彻底吃透，就能更扎实。" };
    return { title: "很扎实！", msg: "这一课的概念你已经掌握得很牢了。可以挑战下一门课，或者隔几天回来重刷保持手感。" };
  }

  function renderResults() {
    var questions = session.items.map(function (item) { return item.question; });
    var result = QuizCore.gradeQuiz(questions, session.answers);
    var band = bandMessage(result.percent);
    var total = session.items.length;

    // 每个主题聚合一次 recordSession（跨主题会话按主题拆分）
    var byTopic = {};
    session.items.forEach(function (item, i) {
      var bucket = byTopic[item.topicId] ||
        (byTopic[item.topicId] = { topicTitle: item.topicTitle, total: 0, correct: 0 });
      bucket.total++;
      if (result.details[i].isCorrect) bucket.correct++;
    });
    Object.keys(byTopic).forEach(function (tid) {
      state.progress = ProgressCore.recordSession(state.progress, tid, byTopic[tid].total, byTopic[tid].correct);
    });
    persistProgress();
    updateNavProgress();

    // 掌握度变化（单主题会话）
    var masteryLine = "";
    if (session.singleTopic && session.topic) {
      var mNow = topicMasteryOf(session.topic);
      var before = session.beforeMasteryPct;
      masteryLine =
        '<p class="mastery-delta">' + icon("target", 15) +
          (before != null && before !== mNow.percent
            ? "掌握度 " + before + "% → " + mNow.percent + "%"
            : "当前掌握度 " + mNow.percent + "%") +
          " · 已掌握 " + mNow.mastered + "/" + mNow.total + " 题" +
          (mNow.wrong > 0 ? " · 待重练错题 " + mNow.wrong + " 题" : "") +
        "</p>";
    } else {
      var parts = Object.keys(byTopic).map(function (tid) {
        return esc(byTopic[tid].topicTitle) + " " + byTopic[tid].correct + "/" + byTopic[tid].total;
      });
      masteryLine = '<p class="mastery-delta">' + icon("target", 15) + "分科成绩：" + parts.join(" · ") + "</p>";
    }

    var wrongItems = result.details
      .map(function (d, i) { return { d: d, item: session.items[i] }; })
      .filter(function (x) { return !x.d.isCorrect; })
      .map(function (x) {
        var q = x.item.question;
        var notesHtml = "";
        if (Array.isArray(q.optionNotes) && q.optionNotes.length > 0) {
          notesHtml =
            '<div class="review-notes">' +
              q.optionNotes.map(function (n, i) {
                return '<p class="review-note"><b>' + LETTERS[i] + "</b>" + esc(n) + "</p>";
              }).join("") +
            "</div>";
        }
        return (
          '<div class="review-item">' +
            codeBlockHtml(q.code) +
            '<p class="review-q">' + esc(q.question) + "</p>" +
            '<p class="review-line your"><span class="tag">你的答案</span>' +
              (x.d.selectedIndex == null ? "未作答" : esc(q.options[x.d.selectedIndex])) + "</p>" +
            '<p class="review-line right"><span class="tag">正确答案</span>' +
              (x.d.correctIndex == null ? "—" : esc(q.options[x.d.correctIndex])) + "</p>" +
            '<p class="review-exp">' + esc(q.explanation || "") + "</p>" +
            notesHtml +
            tagsHtml(q.tags) +
          "</div>"
        );
      });

    var reviewHtml;
    if (wrongItems.length === 0) {
      reviewHtml =
        '<div class="review" role="region" aria-label="错题回顾">' +
          "<h2>错题回顾</h2>" +
          '<p class="review-all-good">' + icon("check", 16) + " 全部答对，没有错题，漂亮！</p>" +
        "</div>";
    } else {
      reviewHtml =
        '<div class="review" role="region" aria-label="错题回顾">' +
          "<h2>错题回顾（" + wrongItems.length + " 题）</h2>" +
          '<p class="review-note-hint">这些错题已加入错题本，可在下方一键重练。</p>' +
          wrongItems.join("") +
          '<div class="review-page-actions">' +
            '<a class="btn btn-ghost" href="#/review">打开错题本 ' + icon("arrow", 15) + "</a>" +
          "</div>" +
        "</div>";
    }

    var r = 54, circ = 2 * Math.PI * r;
    var offset = circ * (1 - result.percent / 100);
    var backLabel = session.mode === "review" ? "返回错题本" : (session.singleTopic ? "返回课程" : "返回首页");

    app.innerHTML =
      '<div class="quiz-layout results" style="--topic-accent:' + (session.topic ? session.topic.accent : "#0c6b58") + '">' +
        '<div role="status" aria-live="polite">' +
          '<div class="score-ring-wrap rise">' +
            '<svg class="score-ring" width="140" height="140" viewBox="0 0 140 140" aria-hidden="true">' +
              '<circle class="track" cx="70" cy="70" r="' + r + '" fill="none" stroke-width="12"/>' +
              '<circle class="fill" cx="70" cy="70" r="' + r + '" fill="none" stroke-width="12" stroke-linecap="round"' +
                ' stroke-dasharray="' + circ.toFixed(1) + '" stroke-dashoffset="' + offset.toFixed(1) + '"/>' +
            "</svg>" +
            '<span class="score-ring-label"><b>' + result.correct + "/" + total + "</b><span>答对题数</span></span>" +
          "</div>" +
          '<h1 class="rise rise-1">' + esc(band.title) + " · " + result.percent + " 分</h1>" +
          '<p class="band-msg rise rise-2">' + esc(band.msg) + "</p>" +
          masteryLine +
          '<div class="results-actions rise rise-3">' +
            '<button type="button" class="btn btn-primary" id="btn-retry">' + icon("refresh", 16) + " 再来一次</button>" +
            '<a class="btn btn-ghost" href="' + session.backHref + '">' + backLabel + "</a>" +
          "</div>" +
        "</div>" +
        reviewHtml +
      "</div>";

    requestAnimationFrame(function () {
      var fill = app.querySelector(".score-ring .fill");
      if (fill) fill.style.strokeDashoffset = String(offset.toFixed(1));
    });

    document.getElementById("btn-retry").addEventListener("click", function () {
      session = buildSession(session.topicId, session.mode);
      if (!session || session.items.length === 0) { renderQuizEmpty(); return; }
      renderQuestion();
    });
  }

  /* ------------------------- 视图：404 ------------------------- */
  function renderNotFound(badId) {
    app.innerHTML =
      '<section class="notfound" role="status">' +
        icon("book", 40) +
        "<h1>没有找到这门课</h1>" +
        "<p>地址里的课程编号 <code>" + esc(badId || "—") + "</code> 不在当前课程列表中，可能链接已过期。</p>" +
        '<a class="btn btn-primary" href="#/">回到首页看全部课程</a>' +
      "</section>";
  }

  /* ------------------------- 路由 ------------------------- */
  var pendingScroll = null;

  function parseRoute() {
    var hash = location.hash || "#/";
    var qIndex = hash.indexOf("?");
    var pathPart = qIndex > -1 ? hash.slice(0, qIndex) : hash;
    var queryStr = qIndex > -1 ? hash.slice(qIndex + 1) : "";
    var parts = pathPart.replace(/^#\/?/, "").split("/").filter(Boolean);
    var query = {};
    try {
      new URLSearchParams(queryStr).forEach(function (v, k) { query[k] = v; });
    } catch (e) { /* 极老环境直接忽略查询参数 */ }

    if (parts.length === 0) return { name: "home" };
    if (parts[0] === "topic" && parts[1]) return { name: "topic", id: decodeURIComponent(parts[1]) };
    if (parts[0] === "review") return { name: "review" };
    if (parts[0] === "quiz" && parts[1]) {
      var mode = query.mode;
      if (mode !== "quick" && mode !== "all" && mode !== "review") mode = "quick";
      return { name: "quiz", id: decodeURIComponent(parts[1]), mode: mode };
    }
    return { name: "notfound", id: parts.join("/") };
  }

  function render() {
    var route = parseRoute();

    if (route.name === "home") {
      renderHome();
      document.title = "起点编程 DevStart · 零基础计算机基础训练场";
    } else if (route.name === "review") {
      renderReview();
      document.title = "错题本 · 起点编程";
    } else if (route.name === "topic" || route.name === "quiz") {
      var topic = getTopic(route.id);
      if (!topic && route.id !== "all") {
        renderNotFound(route.id);
        document.title = "未找到课程 · 起点编程";
        window.scrollTo(0, 0);
        return;
      }
      if (route.name === "topic") {
        renderTopic(topic);
        document.title = topic.title + " · 起点编程";
      } else {
        session = buildSession(route.id, route.mode);
        if (!session) {
          renderNotFound(route.id);
          document.title = "未找到课程 · 起点编程";
          window.scrollTo(0, 0);
          return;
        }
        if (session.items.length === 0) {
          renderQuizEmpty();
          document.title = "错题重练 · 起点编程";
          window.scrollTo(0, 0);
          return;
        }
        renderQuestion();
        document.title = "刷题 · " + (session.singleTopic ? session.topic.title : "错题重练") + " · 起点编程";
      }
    } else {
      renderNotFound(route.id);
      document.title = "页面不存在 · 起点编程";
    }

    if (pendingScroll) {
      var target = document.getElementById(pendingScroll);
      pendingScroll = null;
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
    window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", render);

  /* 导航锚点（课程 / 学习路线） */
  document.addEventListener("click", function (e) {
    var link = e.target.closest ? e.target.closest("[data-nav][data-scroll]") : null;
    if (!link) return;
    e.preventDefault();
    var id = link.getAttribute("data-scroll");
    if (parseRoute().name === "home") {
      var target = document.getElementById(id);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      pendingScroll = id;
      if (location.hash === "#/" || location.hash === "" || location.hash === "#") {
        render();
      } else {
        location.hash = "#/";
      }
    }
  });

  /* ------------------------- 键盘操作 ------------------------- */
  document.addEventListener("keydown", function (e) {
    if (!session || parseRoute().name !== "quiz") return;
    if (!session.items.length || session.index >= session.items.length) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (notesDialog && notesDialog.open) return;

    // Enter：提交 / 下一题。
    // - 焦点在「提交/下一题」按钮上：交给原生 click，避免双触发。
    // - 焦点在选项按钮上：Enter 含义是「提交当前选择」。
    if (e.key === "Enter") {
      var t = e.target;
      if (t && t.tagName === "BUTTON") {
        if (!t.hasAttribute("data-option")) return;
        e.preventDefault();
        if (session.locked[session.index]) return;
        var submitBtn = document.getElementById("quiz-primary");
        if (submitBtn && !submitBtn.disabled) submitBtn.click();
        return;
      }
      e.preventDefault();
      var primary = document.getElementById("quiz-primary");
      if (primary && !primary.disabled) primary.click();
      return;
    }

    // 1–4：选择选项，焦点跟随到被选项，保证后续 Enter 语义明确
    var digit = /^([1-9])$/.exec(e.key);
    if (digit && !session.locked[session.index]) {
      var idx = Number(digit[1]) - 1;
      var current = session.items[session.index].question;
      if (idx < current.options.length) {
        var btn = app.querySelector('[data-option="' + idx + '"]');
        if (btn) { e.preventDefault(); btn.click(); btn.focus(); }
      }
    }
  });

  /* ------------------------- 清除进度 ------------------------- */
  var clearBtn = document.getElementById("clear-progress");
  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      var ok = window.confirm("确定清除全部本地学习进度吗？此操作不可恢复。");
      if (!ok) return;
      clearAllProgress();
      render();
    });
  }

  /* ------------------------- 启动 ------------------------- */
  wireDialog();
  boot();
})();

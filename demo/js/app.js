/*
 * 起点编程 DevStart — 应用逻辑
 * 纯原生 JS：hash 路由 + 渲染 + localStorage 进度。无任何外部依赖。
 */
(function () {
  "use strict";

  /* ------------------------- 基础引用 ------------------------- */
  var DATA = window.LEARN_DATA;
  var QuizCore = window.QuizCore;
  var app = document.getElementById("app");
  var navProgress = document.getElementById("nav-progress");

  var PROGRESS_KEY = "devstart:progress:v1";
  var LETTERS = ["A", "B", "C", "D", "E", "F"];

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
      '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20"/>'
  };

  function icon(name, size) {
    return '<svg viewBox="0 0 24 24" width="' + (size || 22) + '" height="' + (size || 22) +
      '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (ICONS[name] || "") + "</svg>";
  }

  /* ------------------------- 工具 ------------------------- */
  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function getTopic(id) {
    for (var i = 0; i < DATA.topics.length; i++) {
      if (DATA.topics[i].id === id) return DATA.topics[i];
    }
    return null;
  }

  function totalQuestions() {
    return DATA.topics.reduce(function (sum, t) { return sum + t.questions.length; }, 0);
  }

  function loadProgress() {
    try {
      var raw = localStorage.getItem(PROGRESS_KEY);
      if (!raw) return {};
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  function saveProgress(store) {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(store));
    } catch (e) { /* 隐私模式等场景下静默失败 */ }
  }

  function topicProgress(topicId) {
    return loadProgress()[topicId] || null;
  }

  function recordResult(topicId, total, correct) {
    var store = loadProgress();
    var prev = store[topicId] || { bestScore: 0, total: total, attempts: 0, lastScore: 0, updatedAt: 0 };
    store[topicId] = {
      bestScore: Math.max(prev.bestScore || 0, correct),
      total: total,
      attempts: (prev.attempts || 0) + 1,
      lastScore: correct,
      updatedAt: Date.now()
    };
    saveProgress(store);
    updateNavProgress();
  }

  function updateNavProgress() {
    var store = loadProgress();
    var done = DATA.topics.filter(function (t) { return store[t.id] && store[t.id].attempts > 0; }).length;
    if (navProgress) navProgress.textContent = "进度 " + done + "/" + DATA.topics.length;
  }

  /* ------------------------- 视图：首页 ------------------------- */
  function topicCard(topic, i) {
    var p = topicProgress(topic.id);
    var bestHtml;
    if (p && p.attempts > 0) {
      var pct = p.total ? Math.round((p.bestScore / p.total) * 100) : 0;
      bestHtml =
        '<div class="topic-progress">' +
          '<span>最佳成绩 <b>' + p.bestScore + "/" + p.total + "</b>（" + pct + "%）· 已练 " + p.attempts + " 次</span>" +
        "</div>" +
        '<div class="best-bar" role="img" aria-label="最佳成绩 ' + pct + '%"><i style="width:' + pct + '%"></i></div>';
    } else {
      bestHtml =
        '<div class="topic-progress"><span>尚未开始，刷题赢取最佳成绩</span></div>' +
        '<div class="best-bar"><i style="width:0%"></i></div>';
    }
    return (
      '<a class="topic-card rise rise-' + ((i % 5) + 1) + '" style="--accent:' + topic.accent + '" href="#/topic/' + topic.id + '">' +
        '<div class="topic-card-top">' +
          '<span class="topic-icon">' + icon(topic.icon) + "</span>" +
          '<span class="topic-level">' + esc(topic.level) + "</span>" +
        "</div>" +
        "<h3>" + esc(topic.title) + "</h3>" +
        '<p class="topic-tagline">' + esc(topic.tagline) + "</p>" +
        '<div class="topic-meta">' +
          "<span>理论 <b>" + topic.estimatedMinutes + " 分钟</b></span>" +
          "<span>题目 <b>" + topic.questions.length + " 道</b></span>" +
          "<span>知识卡 <b>" + topic.cards.length + " 张</b></span>" +
        "</div>" +
        bestHtml +
        '<span class="topic-open">进入课程 ' + icon("arrow", 15) + "</span>" +
      "</a>"
    );
  }

  function renderHome() {
    var totalQ = totalQuestions();
    var cards = DATA.topics.map(topicCard).join("");
    app.innerHTML =
      '<section class="hero">' +
        '<p class="hero-kicker rise">零基础 · 系统训练 · 完全免费</p>' +
        '<h1 class="rise rise-1">打好编程地基，<br>从<span class="accent">五门基本功</span>开始</h1>' +
        '<p class="hero-sub rise rise-2">起点编程把编程入门拆成 5 个互相独立的小课：每课 3 张知识卡讲清概念，8 道题当场验证。看懂了再动手刷，错了立刻看解析——像请了一位随时在场的助教。</p>' +
        '<div class="hero-actions rise rise-3">' +
          '<a class="btn btn-primary" href="#/topic/python">从 Python 开始 ' + icon("arrow", 16) + "</a>" +
          '<a class="btn btn-ghost" href="#/" data-nav data-scroll="how">了解怎么学</a>' +
        "</div>" +
        '<div class="hero-stats rise rise-4">' +
          "<div><strong>5</strong><span>大主题课程</span></div>" +
          "<div><strong>" + totalQ + "</strong><span>道精选题目</span></div>" +
          "<div><strong>100%</strong><span>本地运行 · 数据不出浏览器</span></div>" +
        "</div>" +
      "</section>" +

      '<section class="section" id="topics" aria-labelledby="topics-title">' +
        '<div class="section-head"><h2 id="topics-title">课程主题</h2><p>按推荐顺序排列，也可以按兴趣任选</p></div>' +
        '<div class="topic-grid">' + cards + "</div>" +
      "</section>" +

      '<section class="section" id="how" aria-labelledby="how-title">' +
        '<div class="section-head"><h2 id="how-title">三步学习法</h2><p>每一课都按同样的节奏推进</p></div>' +
        '<div class="how-grid">' +
          '<div class="how-step"><h3>看知识卡</h3><p>每课 3 张知识卡，把概念拆成短句和要点，先建立正确的直觉，不背书。</p></div>' +
          '<div class="how-step"><h3>刷题验证</h3><p>8 道单选题即时检验：提交后马上知道对错，并附 1–3 句人话解析。</p></div>' +
          '<div class="how-step"><h3>错题回顾</h3><p>交卷后集中回看错题与正确答案，针对薄弱点重练，直到成绩稳定。</p></div>' +
        "</div>" +
      "</section>";
  }

  /* ------------------------- 视图：课程详情 ------------------------- */
  function renderTopic(topic) {
    var p = topicProgress(topic.id);
    var attempts = p ? p.attempts : 0;
    var best = p ? p.bestScore : 0;
    var total = topic.questions.length;
    var pct = attempts > 0 && p.total ? Math.round((best / p.total) * 100) : 0;
    var ctaLabel = attempts > 0 ? "继续练习（" + total + " 题）" : "开始刷题（" + total + " 题）";

    var cardsHtml = topic.cards.map(function (card, i) {
      var num = String(i + 1).padStart(2, "0");
      return (
        '<article class="kcard rise rise-' + ((i % 5) + 1) + '">' +
          '<p class="kcard-index">知识卡 ' + num + "</p>" +
          "<h2>" + esc(card.title) + "</h2>" +
          '<p class="summary">' + esc(card.summary) + "</p>" +
          "<ul>" + card.points.map(function (pt) { return "<li>" + esc(pt) + "</li>"; }).join("") + "</ul>" +
        "</article>"
      );
    }).join("");

    app.innerHTML =
      '<nav class="breadcrumb" aria-label="面包屑">' +
        '<a href="#/">首页</a><span class="sep">/</span><span>' + esc(topic.title) + "</span>" +
      "</nav>" +

      '<section class="topic-hero">' +
        '<span class="topic-icon" style="--accent:' + topic.accent + '">' + icon(topic.icon, 30) + "</span>" +
        "<div>" +
          '<h1>' + esc(topic.title) + "</h1>" +
          '<p class="tagline">' + esc(topic.tagline) + "</p>" +
          '<p class="desc">' + esc(topic.description) + "</p>" +
          '<div class="topic-hero-meta">' +
            "<span>难度 <b>" + esc(topic.level) + "</b></span>" +
            "<span>理论阅读约 <b>" + topic.estimatedMinutes + " 分钟</b></span>" +
            "<span>配套习题 <b>" + total + " 道</b></span>" +
          "</div>" +
        "</div>" +
      "</section>" +

      '<div class="topic-layout">' +
        '<div class="card-seq" aria-label="知识卡列表">' + cardsHtml + "</div>" +

        '<aside class="side-panel" aria-label="课程进度与练习入口">' +
          "<h2>课程进度</h2>" +
          '<div class="side-stat"><span>最佳成绩</span><b>' + (attempts > 0 ? best + " / " + p.total : "—") + "</b></div>" +
          '<div class="side-stat"><span>练习次数</span><b>' + attempts + "</b></div>" +
          '<div class="side-stat"><span>最佳正确率</span><b>' + (attempts > 0 ? pct + "%" : "—") + "</b></div>" +
          '<div class="side-progress-track" role="progressbar" aria-label="最佳正确率" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><i style="width:' + pct + '%"></i></div>' +
          '<a class="btn btn-primary" style="justify-content:center" href="#/quiz/' + topic.id + '">' + ctaLabel + " " + icon("arrow", 16) + "</a>" +
          '<p class="side-note">' + (attempts > 0 ? "上次成绩 " + p.lastScore + " / " + p.total + "，刷满 8 题即可刷新最佳纪录。" : "先浏览知识卡，再进入刷题效果最好。") + "</p>" +
        "</aside>" +
      "</div>";
  }

  /* ------------------------- 视图：刷题 ------------------------- */
  var session = null; // { topicId, index, answers: [null,...], locked: [bool,...] }

  function startSession(topicId) {
    var topic = getTopic(topicId);
    session = {
      topicId: topicId,
      index: 0,
      answers: topic.questions.map(function () { return null; }),
      locked: topic.questions.map(function () { return false; })
    };
  }

  function scoreSoFar() {
    if (!session) return { correct: 0, locked: 0 };
    var topic = getTopic(session.topicId);
    var correct = 0, locked = 0;
    for (var i = 0; i < topic.questions.length; i++) {
      if (session.locked[i]) {
        locked++;
        if (session.answers[i] === topic.questions[i].answerIndex) correct++;
      }
    }
    return { correct: correct, locked: locked };
  }

  function quizHeader(topic, qIndex, total) {
    var pct = Math.round((qIndex / total) * 100);
    return (
      '<div class="quiz-topbar">' +
        '<a class="back-link" href="#/topic/' + topic.id + '">' + icon("back", 15) + " 返回课程</a>" +
        '<span class="quiz-topic">' + esc(topic.title) + "</span>" +
        '<span class="quiz-counter" id="quiz-counter">第 ' + (qIndex + 1) + " 题 / 共 " + total + " 题</span>" +
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
        '<span class="option-text">' + esc(q.options[i]) + "</span>" +
        flag +
      "</button>"
    );
  }

  function renderQuestion() {
    var topic = getTopic(session.topicId);
    var total = topic.questions.length;
    var q = topic.questions[session.index];
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
          '<p class="feedback-exp"><b>解析：</b>' + esc(q.explanation) + "</p>" +
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
      '<div class="quiz-layout" style="--topic-accent:' + topic.accent + '">' +
        quizHeader(topic, session.index, total) +
        '<article class="quiz-card" aria-labelledby="q-text">' +
          '<div class="q-head">' +
            '<span class="q-num">Q' + String(session.index + 1).padStart(2, "0") + "</span>" +
            '<span class="q-diff diff-' + esc(q.difficulty) + '">' + esc(q.difficulty) + "</span>" +
            "<span>" + esc(topic.title) + "</span>" +
          "</div>" +
          '<h1 class="q-text" id="q-text">' + esc(q.question) + "</h1>" +
          '<div class="options" role="group" aria-label="选项（单选）">' + opts + "</div>" +
          feedback +
          '<div class="quiz-foot">' +
            '<span class="quiz-score-so-far" id="quiz-score">当前已判 ' + soc.locked + " 题 · 答对 " + soc.correct + " 题</span>" +
            '<span class="spacer"></span>' +
            primaryBtn +
          "</div>" +
        "</article>" +
      "</div>";

    wireQuizCard(topic, q);
  }

  function wireQuizCard(topic, q) {
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
        var total = topic.questions.length;
        if (!session.locked[session.index]) {
          if (session.answers[session.index] == null) return;
          session.locked[session.index] = true;
          renderQuestion();
          var nextPrimary = document.getElementById("quiz-primary");
          if (nextPrimary) nextPrimary.focus();
        } else if (session.index < total - 1) {
          session.index++;
          renderQuestion();
        } else {
          renderResults(topic);
        }
      });
    }
  }

  /* ------------------------- 视图：结果 ------------------------- */
  function bandMessage(pct) {
    if (pct < 60) return { title: "再巩固一下", msg: "别灰心——把错题解析读一遍，再回到知识卡里找对应的概念，很快就能补齐。" };
    if (pct < 85) return { title: "不错，已入门", msg: "基础已经立住了！回看下面的错题，把模糊的概念彻底吃透，就能更扎实。" };
    return { title: "很扎实！", msg: "这一课的概念你已经掌握得很牢了。可以挑战下一门课，或者隔几天回来重刷保持手感。" };
  }

  function renderResults(topic) {
    var total = topic.questions.length;
    var result = QuizCore.gradeQuiz(topic.questions, session.answers);
    var band = bandMessage(result.percent);

    var wrongItems = result.details
      .map(function (d, i) { return { d: d, q: topic.questions[i] }; })
      .filter(function (x) { return !x.d.isCorrect; })
      .map(function (x) {
        return (
          '<div class="review-item">' +
            '<p class="review-q">' + esc(x.q.question) + "</p>" +
            '<p class="review-line your"><span class="tag">你的答案</span>' +
              (x.d.selectedIndex == null ? "未作答" : esc(x.q.options[x.d.selectedIndex])) + "</p>" +
            '<p class="review-line right"><span class="tag">正确答案</span>' +
              (x.d.correctIndex == null ? "—" : esc(x.q.options[x.d.correctIndex])) + "</p>" +
            '<p class="review-exp">' + esc(x.q.explanation) + "</p>" +
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
          wrongItems.join("") +
        "</div>";
    }

    // 分数环：周长 = 2πr
    var r = 54, circ = 2 * Math.PI * r;
    var offset = circ * (1 - result.percent / 100);

    app.innerHTML =
      '<div class="quiz-layout results" style="--topic-accent:' + topic.accent + '">' +
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
          '<p class="band-stat rise rise-2">' + esc(topic.title) + " · 本科共 " + total + " 题</p>" +
          '<div class="results-actions rise rise-3">' +
            '<button type="button" class="btn btn-primary" id="btn-retry">' + icon("refresh", 16) + " 重新练习</button>" +
            '<a class="btn btn-ghost" href="#/topic/' + topic.id + '">返回课程</a>' +
          "</div>" +
        "</div>" +
        reviewHtml +
      "</div>";

    // 成绩入库（bestScore 存正确题数）
    recordResult(topic.id, total, result.correct);
    // 动画起点：从 0 环开始生长
    requestAnimationFrame(function () {
      var fill = app.querySelector(".score-ring .fill");
      if (fill) fill.style.strokeDashoffset = String(offset.toFixed(1));
    });

    document.getElementById("btn-retry").addEventListener("click", function () {
      startSession(topic.id);
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
    var parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    if (parts.length === 0) return { name: "home" };
    if (parts[0] === "topic" && parts[1]) return { name: "topic", id: decodeURIComponent(parts[1]) };
    if (parts[0] === "quiz" && parts[1]) return { name: "quiz", id: decodeURIComponent(parts[1]) };
    return { name: "home" };
  }

  function render() {
    var route = parseRoute();

    if (route.name === "home") {
      renderHome();
      document.title = "起点编程 DevStart · 零基础计算机基础训练场";
    } else if (route.name === "topic" || route.name === "quiz") {
      var topic = getTopic(route.id);
      if (!topic) {
        renderNotFound(route.id);
        document.title = "未找到课程 · 起点编程";
        window.scrollTo(0, 0);
        return;
      }
      if (route.name === "topic") {
        renderTopic(topic);
        document.title = topic.title + " · 起点编程";
      } else {
        startSession(topic.id);
        renderQuestion();
        document.title = "刷题 · " + topic.title + " · 起点编程";
      }
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
    if (!session || !parseRoute || parseRoute().name !== "quiz") return;
    var topic = getTopic(session.topicId);
    if (!topic || session.index >= topic.questions.length) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;

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
      if (idx < topic.questions[session.index].options.length) {
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
      try { localStorage.removeItem(PROGRESS_KEY); } catch (err) { /* 忽略 */ }
      updateNavProgress();
      render();
    });
  }

  /* ------------------------- 启动 ------------------------- */
  updateNavProgress();
  render();
})();

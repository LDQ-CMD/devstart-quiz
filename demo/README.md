# 起点编程 DevStart · 本地 Demo

面向零基础学习者的计算机基础学习与刷题演示。包含 5 个主题、15 张知识卡、40 道单选题，纯本地运行，无构建步骤、无后端、无外部依赖。

## 快速开始

**方式一：直接打开（最简单）**

双击 `index.html`，或把它拖进浏览器即可。所有脚本均为传统脚本、使用相对路径，兼容 `file://` 协议。

**方式二：本地静态服务器（推荐开发时使用）**

在仓库根目录执行：

```bash
python -m http.server 8000 -d demo
```

然后访问 <http://localhost:8000/>。

## 已实现功能

- 首页：产品介绍、5 个主题入口、三步学习法、学习进度摘要。
- 主题详情：3 张知识卡、最佳成绩 / 练习次数 / 正确率、刷题入口。
- 刷题：8 道单选，逐题作答；提交后锁定选项、即时判分并展示解析。
- 键盘操作：`1`–`4` 选择选项，`Enter` 提交 / 下一题。
- 结果页：得分环、分档评语、错题回顾（你的答案 / 正确答案 / 解析）、重新练习。
- 本地进度：`localStorage` 保存最佳成绩（键：`devstart:progress:v1`），页脚可清除。
- 响应式布局（375px 起）、键盘焦点可见、`aria-live` 反馈、正误不只靠颜色区分。

## 路由

| 路由 | 页面 |
| --- | --- |
| `#/` | 首页 |
| `#/topic/:id` | 主题详情（`python` / `docker` / `k8s` / `linux` / `git`） |
| `#/quiz/:id` | 刷题与结果页 |

刷新、深链接和浏览器前进 / 后退均可用。

## 目录结构

```text
demo/
├── index.html          # 页面骨架与脚本入口
├── css/styles.css      # 设计系统与全部样式
├── js/
│   ├── data.js         # 课程与题库（浏览器 + Node 双端可读）
│   ├── quiz-core.js    # 判分纯函数 gradeQuiz（UMD）
│   └── app.js          # hash 路由、视图渲染、交互与进度存储
└── README.md
```

内容与逻辑分离：新增课程只需按现有结构向 `js/data.js` 的 `topics` 中追加主题。

## 数据约定

```js
{
  version: 1,
  topics: [{
    id, title, tagline, description, level, estimatedMinutes, accent, icon,
    cards: [{ title, summary, points: [] }],
    questions: [{
      id, question, options: [4 项], answerIndex, explanation, difficulty
    }]
  }]
}
```

## 测试

在仓库根目录执行（Node 18+，无需安装依赖）：

```bash
node --test
node --check demo/js/data.js
node --check demo/js/quiz-core.js
node --check demo/js/app.js
```

测试覆盖：

- `tests/data.test.js`：主题 / 卡片 / 题目数量、ID 唯一性、选项与答案合法性、解析长度、中文内容。
- `tests/quiz-core.test.js`：全对、全错、部分正确、空答案、缺省答案、百分比取整、空题库。
- `tests/smoke.test.js`：关键文件、脚本加载顺序、无外部网络依赖、路由与存储键、README。

## 说明与边界

- 这是学习产品 Demo，进度仅保存在当前浏览器；清理浏览器数据或点击「清除本地进度」会重置。
- 刷新刷题页会重新开始当前主题的练习（路由会保留），答题中途状态不持久化。
- Docker / Kubernetes 目前只做概念入门，不含真实容器或集群操作。
- 产品规划、指标与后续路线见 [`../docs/产品计划书.md`](../docs/产品计划书.md)。

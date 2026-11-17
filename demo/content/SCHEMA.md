# 题库内容规范 v2

正式版题库的唯一数据源是 `demo/content/packs/<topic>.json`。`demo/content/bundle.json` 和 `demo/js/data.js` 由脚本生成，**不要手工编辑生成文件**。

## 文件与命名

| 项 | 规则 |
| --- | --- |
| 主题文件 | `demo/content/packs/<topic-id>.json` |
| 主题 ID | 小写英文/数字/连字符：`python`、`data-structures` |
| 知识卡 ID | `<topic>-card-01` 起，两位数 |
| 题目 ID | `<topic>-001` 起，三位数，全局唯一 |
| 题量 | 每个主题 **15 道** |
| 知识卡 | 每个主题 **4 张** |
| 难度 | `基础` / `进阶` / `挑战`；每主题建议 7–8 / 5–6 / 2–3 |
| 正确项分布 | 每主题 A–D 至少各出现 2 次，不允许连续 4 题同一位置 |

## 主题字段

```json
{
  "schemaVersion": 2,
  "id": "python",
  "title": "Python 编程基础",
  "tagline": "一句话副标题",
  "description": "2–3 句课程介绍，说明学完能做什么",
  "level": "入门",
  "estimatedMinutes": 50,
  "accent": "#2f6fb2",
  "icon": "python",
  "objectives": ["学完能……", "能区分……", "能写出……"],
  "cards": [],
  "questions": []
}
```

- `objectives`：3–5 条，使用可验证的行为动词（理解/区分/写出/判断/排查）。
- `estimatedMinutes`：包含阅读 + 15 题练习的预估。
- `icon`：`python` / `docker` / `k8s` / `linux` / `git` / `network` / `sql` / `structure`，与 `id` 对应。

## 知识卡

```json
{
  "id": "python-card-01",
  "title": "变量与数据类型",
  "summary": "1–2 句核心结论，不要复述标题。",
  "points": ["4–6 条要点，每条一个完整判断或操作"],
  "example": {
    "language": "python",
    "caption": "看懂类型推断",
    "code": "age = 18\nprint(type(age))"
  },
  "pitfalls": ["2–3 条新手最容易犯的错，写清后果"]
}
```

- `example` 可选；`language` 取 `python` / `bash` / `yaml` / `dockerfile` / `sql` / `text`。
- 代码必须能独立说明一个概念，不超过 12 行；不要依赖外部文件。
- `points` 4–6 条；`summary` 与 `pitfalls` 必须是简体中文。
- 内容要服务做题：本主题 15 题应能覆盖 4 张卡的核心概念。

## 题目

```json
{
  "id": "python-001",
  "question": "题干，可包含场景描述。",
  "code": {
    "language": "python",
    "content": "nums = [1, 2, 3]\nprint(nums[-1])"
  },
  "options": ["A 的内容", "B 的内容", "C 的内容", "D 的内容"],
  "answerIndex": 3,
  "explanation": "正确原因 + 关键机制，2–3 句。",
  "optionNotes": [
    "A 为什么错（或对）",
    "B 为什么错（或对）",
    "C 为什么错（或对）",
    "D 为什么错（或对）"
  ],
  "difficulty": "进阶",
  "tags": ["列表", "索引"]
}
```

- `code` 可选，适用于代码阅读、命令输出、配置片段；`question` 不要重复代码内容。
- 4 个选项长度接近、互斥、只有一个正确；干扰项必须来自常见误解，不能是明显胡编。
- `explanation` 讲清「为什么」，不能只写「因为选 A」。
- `optionNotes` 固定 4 条，逐项说明对/错；这是正式版的核心深度要求。
- `tags` 1–3 个，用于未来组卷与知识点统计。
- 题干与选项使用纯文本，不要写 HTML/Markdown；代码放在 `code` 中。
- 禁止直接复制现有题库/教材原题；参考官方文档后用自己的话表述。

## 深度要求

每个主题至少包含：

- **4 道场景/排错题**：给出故障现象或需求，问原因、下一步或正确做法。
- **3 道代码/命令阅读题**：给出片段，问输出、行为或错误（Python / Linux / SQL / Git / Docker / K8s / 数据结构按主题适配）。
- **2 道对比/权衡题**：区分容易混淆的概念（如容器 vs 虚拟机、`merge` vs `rebase`、`WHERE` vs `HAVING`）。
- **1–2 道挑战题**：需要两步推理，不能靠关键词匹配。

不要在题干里出现「以下哪项正确」以外的提示性措辞；不要用「以上都对/都不对」作为选项。

## 校验

单文件：

```bash
node scripts/validate-content.js demo/content/packs/python.json
```

全部主题（8 个主题齐全时）：

```bash
node scripts/build-content.js --check
```

校验会检查字段、数量、ID、选项、答案分布、难度分布、optionNotes 长度、代码块结构等。校验不通过的内容不能提交。

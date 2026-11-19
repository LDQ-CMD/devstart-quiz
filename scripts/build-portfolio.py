# -*- coding: utf-8 -*-
"""生成 AI 应用能力作品集 PDF（起点编程 DevStart）。"""
import os
from PIL import Image as PILImage
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle,
    Image, PageBreak, KeepTogether,
)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "docs", "assets")
OUT = os.path.join(ROOT, "docs", "起点编程DevStart-作品集.pdf")

GREEN = colors.HexColor("#2f7d5b")
DARK = colors.HexColor("#1e3b2e")
GREY = colors.HexColor("#5d6c63")
LIGHT = colors.HexColor("#eef5ef")
LINE = colors.HexColor("#d9e2dc")

pdfmetrics.registerFont(TTFont("CN", r"C:\Windows\Fonts\simhei.ttf"))
pdfmetrics.registerFont(TTFont("CNLight", r"C:\Windows\Fonts\msyh.ttc", subfontIndex=0))

styles = {
    "kicker": ParagraphStyle("kicker", fontName="CN", fontSize=11, leading=18, textColor=GREEN, spaceAfter=10),
    "cover_title": ParagraphStyle("cover_title", fontName="CN", fontSize=34, leading=46, textColor=DARK),
    "cover_sub": ParagraphStyle("cover_sub", fontName="CNLight", fontSize=14, leading=24, textColor=colors.HexColor("#4c5a52")),
    "cover_meta": ParagraphStyle("cover_meta", fontName="CNLight", fontSize=10, leading=18, textColor=GREY),
    "sec": ParagraphStyle("sec", fontName="CN", fontSize=17, leading=24, textColor=DARK, spaceAfter=8),
    "h3": ParagraphStyle("h3", fontName="CN", fontSize=11.5, leading=18, textColor=GREEN, spaceBefore=10, spaceAfter=3),
    "body": ParagraphStyle("body", fontName="CNLight", fontSize=9.5, leading=16, textColor=colors.HexColor("#2c322f"), alignment=TA_LEFT, spaceAfter=4),
    "lead": ParagraphStyle("lead", fontName="CNLight", fontSize=10.5, leading=18, textColor=colors.HexColor("#46524b"), spaceAfter=6),
    "li": ParagraphStyle("li", fontName="CNLight", fontSize=9.3, leading=15, leftIndent=12, bulletIndent=2, spaceAfter=3),
    "cap": ParagraphStyle("cap", fontName="CNLight", fontSize=8, leading=12, textColor=GREY, alignment=TA_CENTER, spaceBefore=3),
    "note": ParagraphStyle("note", fontName="CNLight", fontSize=8.8, leading=14, textColor=colors.HexColor("#4b5b4f")),
    "cell": ParagraphStyle("cell", fontName="CNLight", fontSize=8.2, leading=12),
    "cellh": ParagraphStyle("cellh", fontName="CN", fontSize=8.2, leading=12, textColor=DARK),
    "stat_n": ParagraphStyle("stat_n", fontName="CN", fontSize=20, leading=24, textColor=GREEN, alignment=TA_CENTER),
    "stat_l": ParagraphStyle("stat_l", fontName="CNLight", fontSize=8, leading=12, textColor=GREY, alignment=TA_CENTER),
    "flow": ParagraphStyle("flow", fontName="CNLight", fontSize=8, leading=12, textColor=colors.HexColor("#d7f0df")),
    "tag": ParagraphStyle("tag", fontName="CN", fontSize=9, leading=14, textColor=colors.white, alignment=TA_CENTER),
}


def on_page(canvas, doc):
    canvas.saveState()
    if canvas.getPageNumber() == 1:
        canvas.setFillColor(colors.HexColor("#f4f7f0"))
        canvas.rect(0, A4[1] - 205 * mm, A4[0], 205 * mm, stroke=0, fill=1)
    canvas.setFont("CNLight", 7.5)
    canvas.setFillColor(GREY)
    canvas.drawCentredString(A4[0] / 2, 10 * mm, "起点编程 DevStart · AI 应用能力作品 · %d / %d" % (doc.page, getattr(doc, "total_pages", 1)))
    canvas.restoreState()


def P(text, style="body"):
    return Paragraph(text, styles[style])


def stat_table():
    data = [
        [P("8", "stat_n"), P("32", "stat_n"), P("120", "stat_n"), P("65", "stat_n")],
        [P("主题课程", "stat_l"), P("知识卡", "stat_l"), P("精选题目", "stat_l"), P("自动化测试", "stat_l")],
    ]
    t = Table(data, colWidths=[39 * mm] * 4, rowHeights=[13 * mm, 8 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f1f7f3")),
        ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#d7e8dd")),
        ("INNERGRID", (0, 0), (-1, -1), 0.6, colors.white),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    return t


def note_box(text):
    t = Table([[P(text, "note")]], colWidths=[180 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f6f8f2")),
        ("LINEBEFORE", (0, 0), (0, -1), 3, colors.HexColor("#8fae5a")),
        ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return t


def table(headers, rows, widths):
    data = [[P(h, "cellh") for h in headers]]
    for row in rows:
        data.append([P(c, "cell") for c in row])
    t = Table(data, colWidths=widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), LIGHT),
        ("GRID", (0, 0), (-1, -1), 0.5, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#fafcf9")]),
        ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return t


def screenshot(name, caption, max_h=160 * mm):
    path = os.path.join(ASSETS, name)
    iw, ih = PILImage.open(path).size
    w = 180 * mm
    h = w * ih / iw
    if h > max_h:
        h = max_h
        w = h * iw / ih
    img = Image(path, width=w, height=h)
    return KeepTogether([img, P(caption, "cap")])


def build():
    doc = BaseDocTemplate(OUT, pagesize=A4,
                          leftMargin=15 * mm, rightMargin=15 * mm,
                          topMargin=16 * mm, bottomMargin=16 * mm,
                          title="起点编程 DevStart · AI 应用能力作品")
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="main")
    doc.addPageTemplates([PageTemplate(id="all", frames=[frame], onPage=on_page)])

    # 统计总页数（两遍构建）
    story = make_story(doc)
    doc.total_pages = 0
    doc.build(story)
    from pypdf import PdfReader
    total = len(PdfReader(OUT).pages)
    doc.total_pages = total
    doc.build(make_story(doc))
    print(OUT, os.path.getsize(OUT), "bytes,", total, "pages")


def make_story(doc):
    s = []

    # 封面
    s.append(Spacer(1, 34 * mm))
    s.append(P("AI 应用能力作品", "kicker"))
    s.append(P("起点编程", "cover_title"))
    s.append(P("DevStart", "cover_title"))
    s.append(Spacer(1, 5 * mm))
    s.append(P("用 AI 从 0 到 1 构建的计算机基础学习刷题系统", "cover_sub"))
    s.append(Spacer(1, 32 * mm))
    s.append(P("知识卡建立概念 · 刷题即时验证 · 错题回炉巩固<br/>纯静态、本地优先、内容包驱动 · 2026", "cover_meta"))
    s.append(PageBreak())

    # 01 概述
    s.append(P("01 作品概述", "sec"))
    s.append(P("「起点编程 DevStart」面向零基础学习者，把计算机基础拆成互相独立的小课：先用一张知识卡讲清概念，再用一组题验证是否真的会，错题自动沉淀、反复回炉，形成「学一点 → 练一题 → 错题回炉」的完整闭环。产品为纯本地静态站点，双击即可运行，不上传数据、不注册账号。", "lead"))
    s.append(stat_table())
    s.append(P("解决的真实痛点", "h3"))
    for t in [
        "<b>路径乱</b>：资料太多，不知道先学什么、学到什么程度算入门 → 用推荐顺序的 8 个小课给出清晰路线。",
        "<b>假懂</b>：看视频觉得懂了，一做题就暴露漏洞 → 每张知识卡都配对应题目，当场验证。",
        "<b>环境劝退</b>：Docker / K8s 在装环境阶段就流失 → 纯概念入门，零环境要求。",
        "<b>无反馈</b>：自学缺判分和讲解 → 每题 4 条逐选项解析，错在哪一步一目了然。",
        "<b>不复盘</b>：错题没沉淀，学完就忘 → 错题本 + 多种重练模式 + 掌握度/熟练度追踪。",
    ]:
        s.append(Paragraph(t, styles["li"], bulletText="•"))
    s.append(P("内容体系", "h3"))
    s.append(P("首批覆盖 Python 编程基础、Docker 容器入门、Kubernetes 入门、Linux 命令行基础、Git 版本控制、计算机网络基础、SQL 与数据库入门、数据结构入门。主题从「基础」起步，延伸到进阶与挑战，题目类型含代码阅读、命令输出、场景排错与方案权衡。"))
    s.append(PageBreak())

    # 02 界面
    s.append(P("02 界面与学习闭环", "sec"))
    s.append(screenshot("01-home.png", "首页：主题入口、进度概览、错题本入口与三步学习法", max_h=110 * mm))
    s.append(note_box("从首页进入任一主题，先读 4 张知识卡（概念 + 类比 + 示例 + 新手易错），再用「快速练习 / 全部题目 / 错题重练」三种模式刷题，提交后即时判分并展示逐选项解析。"))
    s.append(screenshot("02-topic.png", "主题详情：学习目标、知识卡序列与侧边进度面板（含熟练度与薄弱知识点）", max_h=110 * mm))
    s.append(PageBreak())

    # 03 刷题反馈
    s.append(P("03 刷题与反馈", "sec"))
    s.append(screenshot("03-quiz.png", "答题页：一次只呈现一题，支持键盘 1–4 选择、Enter 提交", max_h=150 * mm))
    s.append(screenshot("04-feedback.png", "提交后：正确项与干扰项逐条解释，解析讲「为什么」", max_h=150 * mm))
    s.append(screenshot("05-result.png", "结果页：得分、分档评语、掌握度变化与错题回顾", max_h=150 * mm))
    s.append(PageBreak())

    # 04 AI 应用
    s.append(P("04 AI 在项目中的应用", "sec"))
    s.append(P("本项目全流程由 AI 辅助完成：AI 负责快速产出初稿与可运行代码，人负责定义目标、审校技术准确性与做取舍。AI 不是「一次性生成器」，而是贯穿规划、内容、开发、测试、文档的工作伙伴。", "lead"))
    s.append(table(
        ["阶段", "AI 的具体工作", "人工把关"],
        [
            ["产品规划", "撰写产品计划书：用户画像、痛点、差异化、指标体系、MVP 边界、里程碑与风险对策", "确认范围，砍掉视频/账号/沙箱等非 MVP 项"],
            ["内容生产", "生成 8 主题大纲、32 张知识卡、120 道题初稿、逐选项解析、难度标签与知识点标签", "技术事实核对、题目去重、难度校准、表述润色"],
            ["代码实现", "编写原生 JS 路由、判分核心、进度核心、内容加载器、响应式 CSS 与页面视图", "架构取舍（静态/零构建/本地优先）、交互走查"],
            ["质量保障", "编写 65 项自动化测试、内容校验脚本与构建脚本，覆盖题库/构建/加载/判分/进度/冒烟", "补充真实浏览器走查、键盘与无障碍检查"],
            ["文档规范", "编写内容更新指南、题库 Schema、README 与使用说明", "与实际流程逐条对照修订"],
        ],
        [24 * mm, 96 * mm, 60 * mm],
    ))
    s.append(note_box("<b>协作方式：</b>把需求拆成清晰的小任务交给 AI，要求先给可运行版本再迭代；对生成内容坚持「初稿 → 校验 → 人工审校 → 测试」四步，避免直接信任输出。这一流程本身即是 AI 应用能力的体现。"))
    s.append(P("产品迭代轨迹", "h3"))
    s.append(P("Demo v0（5 主题 / 40 题）验证了学习闭环；收到「前端体验没问题，但题目深度和熟练度不够」的反馈后，正式版 v1.0 升级为 8 主题 / 120 题，新增进阶与挑战题、逐选项解析、四级熟练度、薄弱知识点与题库独立更新机制，并补齐 65 项自动化测试。"))
    s.append(PageBreak())

    # 05 技术
    s.append(P("05 技术架构与题库更新", "sec"))
    s.append(P("技术选型", "h3"))
    for t in [
        "<b>零依赖、零构建</b>：纯静态 HTML + CSS + 原生 JavaScript，双击 index.html 即可离线运行。",
        "<b>hash 路由</b>：#/、#/topic/:id、#/quiz/:id，支持刷新与前进/后退。",
        "<b>模块解耦</b>：UMD 双端模块 quiz-core（判分）、progress-core（进度/熟练度/组卷）、content-loader（加载回退），既能在浏览器运行，也能被 Node 单测直接引入。",
        "<b>本地存储</b>：进度存于 localStorage（v2 结构），旧版 v1 数据自动迁移不丢失。",
        "<b>无障碍</b>：键盘全流程、可见焦点、aria-live 反馈；正误不只靠颜色，配图标与文字。",
    ]:
        s.append(Paragraph(t, styles["li"], bulletText="•"))
    s.append(P("题库更新机制（内容即代码）", "h3"))
    flow = """demo/content/packs/*.json   ← 人工维护的唯一数据源
      │
      ├─ validate-content.js   校验单包
      ├─ build-content.js      全量校验 + 生成
      ▼
demo/content/bundle.json   ← 在线运行时加载（可独立更新）
demo/js/data.js            ← 离线 / file:// 内置回退
      ▼
ContentLoader.loadContent() ← HTTP 优先，失败自动回退内置题库"""
    ft = Table([[Paragraph(flow.replace("\n", "<br/>"), styles["flow"])]], colWidths=[180 * mm])
    ft.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#1e2b26")),
        ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    s.append(ft)
    s.append(P("题目与代码解耦：日常加题、改解析只需编辑内容包、提升 manifest.json 版本号并重新构建，无需改动应用代码。版本规则为「改题 minor+1、改错别字 patch+1、增删主题 major+1」，页脚展示当前版本、发布日期与更新说明。建议节奏：每 2 周修正与补题、每月扩容、每季度新增主题。"))
    s.append(P("质量保障", "h3"))
    s.append(P("<b>质量标签：</b>65 项测试全通过 · content:check 通过 · 全部 JS 语法检查通过 · 浏览器实测无报错 · 375px 移动端适配"))
    s.append(P("题库校验覆盖：数量 / ID 唯一 / 每题 4 选项与 4 条逐选项解析 / 答案分布 / 难度分布 / 代码题数量 / 生成物一致性。逻辑测试覆盖：判分、进度迁移、掌握度、熟练度、薄弱知识点、组卷优先级、内容加载回退与路由冒烟。"))
    s.append(PageBreak())

    # 06 访问
    s.append(P("06 访问方式", "sec"))
    s.append(P("<b>作品链接（在线 Demo，永久）：</b><br/>https://ldq-cmd.github.io/devstart-quiz/", "body"))
    s.append(P("<b>GitHub / 主页链接：</b><br/>https://github.com/LDQ-CMD/devstart-quiz", "body"))
    s.append(P("<b>本地运行：</b><br/>双击仓库中 demo/index.html 即可离线使用；或在仓库根目录执行 npm run serve 后访问 http://localhost:8000/。", "body"))
    s.append(note_box("在线 Demo 由 GitHub Pages 托管，与仓库代码同步：每次向 main 分支推送，GitHub Actions 自动重新部署 demo 目录，无需手动维护。"))
    s.append(P("交付物清单", "h3"))
    s.append(table(
        ["类别", "内容"],
        [
            ["应用", "demo/index.html、css/、js/（可直接部署为静态站点）"],
            ["题库", "content/packs/*.json（源文件）、bundle.json（产物）、SCHEMA.md"],
            ["脚本", "validate-content.js、build-content.js、content-lib.js"],
            ["测试", "tests/ 下 6 组、65 项自动化测试"],
            ["文档", "产品计划书、内容更新指南、README、本作品集"],
        ],
        [24 * mm, 156 * mm],
    ))
    return s


if __name__ == "__main__":
    build()

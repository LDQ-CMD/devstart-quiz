# 起点编程 DevStart

面向零基础学习者的计算机基础学习与刷题网站：知识卡 → 刷题 → 逐选项解析 → 错题回炉。本地优先，无账号，无后端。

当前版本 **v1.0**：8 个主题、32 张知识卡、120 道题，题库内容包化，可独立更新；按正确率/连对/间隔计算四级熟练度，并定位薄弱知识点。

## 快速开始

```bash
# 直接双击
demo/index.html

# 或本地服务
npm run serve   # python -m http.server 8000 -d demo
```

打开 <http://localhost:8000/>。

## 项目结构

```text
demo/                 应用与题库（可直接部署为静态站点）
  content/packs/      题库源文件（唯一数据源）
  content/bundle.json 生成的在线题库
  js/                 原生 JS：路由、判分、进度、内容加载
docs/                 产品计划书、内容更新指南
scripts/              题库校验与构建
tests/                Node 内置测试（65+ 项）
```

## 常用命令

```bash
npm test                 # 全部测试（Node 内置 test runner）
npm run content:validate # 校验全部内容包
npm run content:build    # 由 packs 生成 bundle.json + data.js
npm run content:check    # 检查生成物是否过期
npm run serve            # 本地预览
```

## 文档

- [产品计划书](docs/产品计划书.md)
- [内容更新指南](docs/内容更新指南.md)
- [题库规范](demo/content/SCHEMA.md)
- [Demo 使用说明](demo/README.md)

# Keep — 交接文档

个人知识记录平台，记录软件工程原则、CSS 示例、架构理论等技术思考。

**生产**：`https://keep.vercel.app`
**仓库**：`git@github.com:Jkortex/keep.git`

---

## 快速开始

```bash
git clone git@github.com:Jkortex/keep.git
cd keep
pnpm install
pnpm dev              # → http://localhost:4321
pnpm build            # 构建 + Pagefind 搜索索引
pnpm check            # TypeScript 类型检查
pnpm format           # Prettier 格式化
```

**要求**：Node ≥ 22.12, pnpm 11

---

## 技术栈

| 层       | 技术                                 | 说明                            |
| -------- | ------------------------------------ | ------------------------------- |
| 框架     | Astro 6                              | SSG，输出纯静态 HTML            |
| 内容     | MDX via Content Collections          | `src/content/knowledge/`        |
| 数据校验 | Zod (Astro 内建)                     | frontmatter schema              |
| 样式     | Tailwind CSS v4                      | `@tailwindcss/vite` 插件        |
| 类型     | TypeScript 6 (strict)                | `pnpm check` 验证               |
| 搜索     | Pagefind                             | 构建时索引，浏览器端查询        |
| 代码高亮 | Shiki 4                              | CodeDemo 源码着色               |
| 格式化   | Prettier 3 + `prettier-plugin-astro` | 保存自动格式化                  |
| 部署     | Vercel                               | 连接 GitHub，push main 自动部署 |

---

## 项目结构

```
keep/
├── src/lib/
│   └── knowledge.ts            # ★ 内容元数据模块（CATEGORIES 注册表 + 排序/分组工具）
├── src/content.config.ts       # Content Collections schema (Zod)
├── src/content/
│   └── knowledge/              # ▼ 所有知识文章，按分类分目录
│       ├── principles/
│       │   ├── cap-theorem.mdx
│       │   └── conways-law.mdx
│       ├── css/
│       │   ├── flexbox.mdx / .css
│       │   └── has-selector.mdx / .css
│       ├── mysql/              # （待填充）
│       ├── redis/              # （待填充）
│       └── engineering/        # （待填充）
├── src/components/
│   ├── ArticleCard.astro       # 文章链接行（普通/简洁两用，home feed 和分类页通用）
│   ├── AllKnowledge.astro      # /knowledge 全知识列表（按分类自动分组）
│   ├── CategoryListing.astro   # 单分类文章列表页
│   ├── HomeFeed.astro          # 首页 Feed（Pills 过滤 + 文章流 + 折叠分类列表）
│   ├── CodeDemo.astro          # 交互式代码演示（预览 + Tab 源码 + 折叠 + 复制）
│   └── Breadcrumbs.astro       # 面包屑导航（从 CATEGORIES 注册表取分类名）
├── src/layouts/
│   └── Layout.astro            # 全局布局（Nav + 主题切换 + 面包屑 + Footer）
│                                #   wide → 首页 max-w-5xl，文章页 max-w-3xl
│                                #   currentTitle → 透传给面包屑，避免全量加载
├── src/pages/
│   ├── index.astro             # 首页 — 纯列表 Feed
│   ├── search.astro            # 全文搜索（Pagefind）
│   └── knowledge/
│       ├── index.astro         # /knowledge — 全知识列表
│       └── [...slug].astro     # 动态路由：分类页 / 文章页
├── src/styles/
│   └── app.css                 # 全局样式 + Tailwind theme tokens
├── src/types.ts                # 共享类型（CodeDemoProps, SourceFile 等）
├── docs/HANDOVER.md
├── astro.config.mjs
├── .prettierrc
├── .editorconfig
└── package.json
```

---

## 核心架构：内容元数据模块

`src/lib/knowledge.ts` 是 2025-06 重构引入的中心模块，提供：

### CATEGORIES 注册表

分类的**唯一事实源**。**新增分类必须同时在此注册**，否则文章可以通过 URL 访问，但不会出现在首页分类列表和分类概览页上。

```typescript
export const CATEGORIES = {
  principles: { title: '软件工程原则', order: 0 },
  css: { title: 'CSS 示例', order: 1 },
  mysql: { title: 'MySQL 笔记', order: 2 },
  redis: { title: 'Redis 笔记', order: 3 },
  engineering: { title: '工程实践', order: 4 },
} as const;
```

`title` 会覆盖文章 frontmatter 中的 `category` 字段。`order` 控制分类排列顺序。

### 导出函数

| 函数                        | 用途                               | 消费方                        |
| --------------------------- | ---------------------------------- | ----------------------------- |
| `getCategoryLabel(slug)`    | slug → 显示名                      | Breadcrumbs, CategoryListing  |
| `getCategories(articles)`   | 按注册表顺序返回分类列表（含计数） | HomeFeed, AllKnowledge        |
| `sortByOrder(articles)`     | `order` 升序                       | AllKnowledge, CategoryListing |
| `sortByCreated(articles)`   | `created` 降序 + `order` 升序      | HomeFeed                      |
| `groupByCategory(articles)` | slug → articles Map                | AllKnowledge                  |
| `getCategorySlug(article)`  | 从 entry.id 提取分类 slug          | 内部使用                      |

---

## 架构核心：Content Collections

所有知识文章存放在 `src/content/knowledge/`，按分类分目录。
Schema 定义在 `src/content.config.ts`，**Zod 自动校验每个 MDX 的 frontmatter**：

```yaml
---
title: CAP 定理 # 必需 — 文章标题
category: 软件工程原则 # 必需 — 分类显示名
description: Consistency… # 可选 — 摘要
tags: [分布式, 数据库] # 可选 — 标签，默认 []
order: 1 # 可选 — 同分类内排序权重，默认 0
created: 2024-01-15 # 可选 — 创建日期
updated: 2024-06-01 # 可选 — 更新日期
---
```

### 路由规则

| URL                             | 处理文件                | 说明                                            |
| ------------------------------- | ----------------------- | ----------------------------------------------- |
| `/`                             | `index.astro`           | 首页 Feed：Pills 过滤 + 最近文章列表 + 折叠分类 |
| `/knowledge`                    | `knowledge/index.astro` | 全知识列表，按 CATEGORIES 注册表顺序分组        |
| `/knowledge/:category`          | `[...slug].astro`       | 分类文章列表                                    |
| `/knowledge/:category/:article` | `[...slug].astro`       | 文章详情页                                      |
| `/search`                       | `search.astro`          | 全文搜索                                        |

### 内容模式

**纯知识页面** — 直接 Markdown：

```mdx
---
title: SOLID 原则
category: 软件工程原则
description: 面向对象设计的五个基本原则
tags: [OOP, 设计模式]
order: 3
---

# SOLID 原则

正文直接用 Markdown…
```

**CSS 示例页面** — 带 CodeDemo 组件：

```mdx
---
title: CSS :has() 选择器
category: CSS 示例
description: 理解 :has() 的原理、解决问题与核心优势
tags: [CSS, 选择器, 布局, 交互, 表单]
order: 2
---

import CodeDemo from '../../../components/CodeDemo.astro';
import './has-selector.css';

说明文字…

<CodeDemo code={源码字符串} lang="html">
  <div class="demo">实际渲染</div>
</CodeDemo>
```

CSS 文件放在同目录下，MDX 中直接 `import`。

### 数据流

```
getCollection('knowledge')
  │
  ├→ knowledge.ts (排序/分组/标签)
  │     │
  │     ├→ getCategories()  → HomeFeed, AllKnowledge
  │     ├→ sortByCreated()  → HomeFeed
  │     ├→ sortByOrder()    → AllKnowledge, CategoryListing
  │     └→ getCategoryLabel() → Breadcrumbs, CategoryListing
  │
  ├→ ArticleCard (渲染每篇文章行)
  └→ Breadcrumbs (仅用 CATEGORIES 注册表 + currentTitle，不加载全量)
```

---

## CodeDemo 组件

交互式代码演示组件，用于 CSS 示例文章。支持：

| 功能         | 说明                                          |
| ------------ | --------------------------------------------- |
| **预览区**   | 渲染实际 HTML/CSS 效果                        |
| **源码 Tab** | 高亮代码，单文件显示文件名，多文件 Tab 切换   |
| **折叠**     | 点击 `^` 折叠源码区，保留 header 栏           |
| **复制**     | hover 显示 Copy 按钮，点击复制当前 tab 代码   |
| **多文件**   | `files` prop 传入多文件（HTML+CSS），Tab 切换 |

**注意**：`<script>` 标签中不能使用 TypeScript 泛型（`querySelector<Element>`），Vite 不会剥离，会导致运行时语法错误。已全部改用 `querySelector('.class')`。

---

## 首页设计（纯列表）

2025-06 重构后，首页改为纯列表布局：

### 移动端（<640px）

```
┌──────────────────────┐
│ Keep           🔍 🌙 │
├──────────────────────┤
│ [所有][原则·2][CSS·2]│  ← 水平滚动 Pills
│ ─────────────────────│
│ CSS :has() 选择器     │
│ 理解 :has() 的原理…   │
│ [CSS] [选择器]       │
│ ─────────────────────│
│ CSS Flexbox 居中      │
│ 使用 Flexbox 实现…    │
│ [CSS] [布局]         │
│ ─────────────────────│
│ CAP 定理              │
│ 分布式系统最多只能…    │
│ [分布式] [数据库]     │
│ ─────────────────────│
│ ▼ 全部分类 · 4 篇    │  ← 折叠
└──────────────────────┘
```

### 桌面端

```
┌──────────────────────────────────┐
│ [所有] [原则·2] [CSS·2] [MySQL]  │
│                                  │
│ CSS :has() 选择器          [CSS] │
│ 理解 :has() 的原理…       [选择器]│
│ ──────────────────────────────── │
│ CSS Flexbox 居中           [CSS] │
│ 使用 Flexbox 实现…         [布局]│
│ ──────────────────────────────── │
│ ...                             │
│                                  │
│ ▼ 全部分类 · 4 篇               │
└──────────────────────────────────┘
```

### 交互

- **Pills 过滤**：点击分类 Pill → 下方文章按 `data-category` 筛选
- **全部分类折叠**：展开后列出 slug → 分类链接 + 文章数
- **文章行**：点击直达文章，hover 文字变色，右侧标签桌面端可见

---

## 添加新内容

### 新建分类 + 文章

```bash
# 1. 注册分类
# 编辑 src/lib/knowledge.ts → CATEGORIES 加新条目

# 2. 创建文章
mkdir src/content/knowledge/engineering
vim src/content/knowledge/engineering/some-topic.mdx
```

**必须同时完成两步**，否则文章不会出现在分类列表中。

### 新建 CSS 示例文章

```bash
vim src/content/knowledge/css/my-demo.mdx
vim src/content/knowledge/css/my-demo.css  # 示例样式
```

MDX 中 import `CodeDemo` 组件和同目录 CSS 文件。

---

## 设计系统

### 风格

Minimalism — 洁净、留白、功能主义。

### 颜色

| Token      | Light                 | Dark                  |
| ---------- | --------------------- | --------------------- |
| Background | `#F8FAFC` (slate-50)  | `#0F172A` (slate-900) |
| Foreground | `#1E293B` (slate-800) | `#F1F5F9` (slate-100) |
| Accent     | `#2563EB` (blue-600)  | `#60A5FA` (blue-400)  |
| Border     | `#E2E8F0` (slate-200) | `#334155` (slate-700) |

暗色模式通过 `<html class="dark">` 控制，`localStorage` 持久化，FOUC prevention 在 `<head>` inline script。

### 分类映射

分类色条逻辑已移除（首页改为纯列表）。分类的图标/色值可自行在 `HomeFeed.astro` 的折叠分类列表中添加。

### 字体

- Body: `IBM Plex Sans` (Google Fonts)
- Code: `JetBrains Mono` (Google Fonts)

### 图标

使用 **Lucide** SVG 图标，禁止使用 emoji 作为结构性图标。

---

## 近期重构记录（2025-06）

| 重构                     | 动机                                               | 涉及文件                                                           |
| ------------------------ | -------------------------------------------------- | ------------------------------------------------------------------ |
| 提取 `knowledge.ts` 模块 | 消除排序/分组/标签逻辑在 4 个组件中重复            | 新增: `src/lib/knowledge.ts`                                       |
| Breadcrumbs 去全量加载   | 之前每页 `getCollection('knowledge')` 加载全部文章 | `Breadcrumbs.astro`, `Layout.astro`, `[...slug].astro`             |
| 合并 ArticleCard         | ArticleFeedCard 和 ArticleCard 近重复              | 删除 `ArticleFeedCard.astro`，`ArticleCard.astro` 加 `simple` prop |
| 首页改为纯列表           | 减少弹窗确认、移动端优先                           | `index.astro`, `HomeFeed.astro`, `ArticleCard.astro`               |
| CodeDemo 增强            | details 折叠太简陋                                 | 加 Tab 切换、Copy 按钮、折叠/展开                                  |
| 脚本 TS 泛型修复         | `querySelector<Element>` 在浏览器中语法错误        | `CodeDemo.astro`, `HomeFeed.astro`                                 |

---

## 命令列表

```bash
pnpm dev              # 开发服务器 :4321
pnpm build            # 构建 + Pagefind 索引
pnpm preview          # 预览构建产物
pnpm check            # TypeScript 类型检查
pnpm format           # Prettier 格式化
pnpm format:check     # 格式化检查
```

---

## CI/CD

**Vercel**：连接 GitHub 仓库，main push 自动构建部署到 `keep.vercel.app`。
**GitHub Actions**（`.github/workflows/ci.yml`）：push/PR 到 main → typecheck + build。

---

## 未完成 / 可改进

| 事项                             | 优先级 | 备注                                       |
| -------------------------------- | ------ | ------------------------------------------ |
| 内容填充                         | 持续   | 当前仅 5 篇，需持续填充                    |
| MySQL/Redis/Engineering 分类填充 | 高     | 已注册到 CATEGORIES，尚无文章              |
| 标签筛选页面                     | 中     | 利用已有 `tags`，加标签聚合页              |
| 搜索优化                         | 中     | 添加 `data-pagefind-body` 标记优化索引范围 |
| 相关文章推荐                     | 低     | 按共享 tags 推荐                           |
| RSS                              | 低     | `@astrojs/rss` 生成订阅源                  |
| 自定义域名                       | 低     | Vercel Settings → Domains                  |
| 更新时间显示                     | 低     | `updated` 字段已在前置数据中，未在前端展示 |

---

## 联系

**作者**: Jkortex
**仓库**: `https://github.com/Jkortex/keep`

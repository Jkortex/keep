# Keep — 交接文档

个人/小团队知识记录平台。记录软件工程原则、架构理论、CSS 示例等技术思考。

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
pnpm check            # TypeScript 类型检查（提交前必做）
pnpm format           # Prettier 格式化
```

**要求**：Node ≥ 22.12, pnpm 11

---

## 技术栈

| 层 | 技术 | 说明 |
|---|---|---|
| 框架 | Astro 6 | SSG，输出纯静态 HTML |
| 内容 | MDX via Content Collections | `src/content/knowledge/` |
| 数据校验 | Zod (Astro 内建) | frontmatter schema |
| 样式 | Tailwind CSS v4 | `@tailwindcss/vite` 插件 |
| 类型 | TypeScript 6 (strict) | `pnpm check` 验证 |
| 搜索 | Pagefind | 构建时索引，浏览器端查询 |
| 代码高亮 | Shiki 4 | CodeDemo 源码着色 |
| 格式化 | Prettier 3 + `prettier-plugin-astro` | 保存自动格式化 |
| 部署 | Vercel | 连接 GitHub，push main 自动部署 |

---

## 项目结构

```
keep/
├── AGENT.md                        # AI agent 上下文说明（新接手先读）
├── src/content.config.ts           # Content Collections schema (Zod)
├── src/content/
│   └── knowledge/                  # ▼ 所有知识文章，按分类分目录
│       ├── principles/
│       │   ├── cap-theorem.mdx
│       │   └── conways-law.mdx
│       ├── css/
│       │   ├── flexbox.mdx
│       │   └── flexbox.css
│       ├── mysql/                  # （待填充）
│       ├── redis/                  # （待填充）
│       └── engineering/            # （待填充）
├── src/components/
│   ├── AllKnowledge.astro          # /knowledge 全知识列表（按分类自动分组）
│   ├── ArticleCard.astro           # 文章链接卡片（用于分类页/知识列表）
│   ├── ArticleFeedCard.astro       # 首页 Feed 文章卡片（时间线样式，带分类色条）
│   ├── Breadcrumbs.astro           # 面包屑导航（从 Content Collection 自动发现分类名）
│   ├── CategoryListing.astro       # 单分类文章列表页
│   ├── CodeDemo.astro              # CSS 示例：预览 + 源码 (Shiki 高亮)
│   └── HomeFeed.astro              # 首页 Feed（Pills 过滤 + 文章流 + 折叠分类列表）
├── src/layouts/
│   └── Layout.astro                # 全局布局（Nav + 主题切换 + Footer）
│                                    #   wide prop → 首页用 max-w-5xl，文章页用 max-w-3xl
├── src/pages/
│   ├── index.astro                 # 首页 — Feed 信息流
│   ├── search.astro                # 全文搜索（Pagefind）
│   └── knowledge/
│       ├── index.astro             # /knowledge — 全知识列表
│       └── [...slug].astro         # 动态路由：分类页 / 文章页
├── src/styles/
│   └── app.css                     # 全局样式 + Tailwind theme tokens + 设计系统
├── src/types.ts                    # 共享类型
├── public/
│   ├── favicon.svg / .ico
│   └── robots.txt
├── astro.config.mjs
├── .prettierrc
├── .editorconfig
└── package.json
```

---

## 架构核心：Content Collections

所有知识文章存放在 `src/content/knowledge/`，按分类分目录。  
Schema 定义在 `src/content.config.ts`，**Zod 自动校验每个 MDX 的 frontmatter**：

```yaml
---
title: CAP 定理              # 必需 — 文章标题
category: 软件工程原则        # 必需 — 分类显示名
description: Consistency…     # 可选 — 摘要
tags: [分布式, 数据库]        # 可选 — 标签，默认 []
order: 1                     # 可选 — 同分类内排序权重，默认 0
created: 2024-01-15          # 可选 — 创建日期
updated: 2024-06-01          # 可选 — 更新日期
---
```

### 路由规则

| URL | 处理文件 | 说明 |
|---|---|---|
| `/` | `index.astro` | 首页 Feed：Pills 过滤 + 最近文章 + 折叠分类 |
| `/knowledge` | `knowledge/index.astro` | 全知识列表，按分类分组 |
| `/knowledge/:category` | `[...slug].astro` | 分类文章列表 |
| `/knowledge/:category/:article` | `[...slug].astro` | 文章详情页 |
| `/search` | `search.astro` | 全文搜索 |

### 两种内容模式

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
title: CSS Grid 布局
category: CSS 示例
description: 使用 Grid 实现二维布局
tags: [CSS, 布局, Grid]
order: 2
---

import CodeDemo from '../../../components/CodeDemo.astro';
import './my.css';

说明文字…

<CodeDemo code={源码字符串} lang="html">
  <div class="demo">实际渲染</div>
</CodeDemo>
```

CSS 文件放在同目录下，MDX 中直接 `import`。

### 自动发现机制

| 页面 | 组件 | 数据来源 |
|---|---|---|
| 首页 Feed | `HomeFeed.astro` | `getCollection('knowledge')` → 按分类分组 + 按时间排序 |
| 首页 Pills | `HomeFeed.astro` | 同上，提取所有分类 |
| 首页分类列表 | `HomeFeed.astro` | 同上，折叠区域 |
| 知识列表 | `AllKnowledge.astro` | `getCollection('knowledge')` → 按 category 分组 |
| 分类页 | `[...slug].astro` / `CategoryListing.astro` | `getCollection` 过滤 entry ID |
| 面包屑 | `Breadcrumbs.astro` | 从 Content Collection 元数据取分类显示名 |

---

## 首页设计（Mobile-First）

### 移动端（<640px）

```
┌──────────────────────┐
│ Keep           🔍 🌙 │
├──────────────────────┤
│ [所有][原则·2][CSS·1]│  ← 水平滚动 Pills，触控 ≥44px
│ [MySQL][Redis]..     │
│ ─────────────────────│
│ ┃ CAP 定理           │  ← 色条标注分类
│ ┃ 分布式系统最多…     │  ← 摘要 2 行
│ ┃ 软件工程原则 · 2h  │  ← 标签 + 相对时间
│ ─────────────────────│
│ ┃ 康威定律           │  ← 触控区 ≥60px
│ ┃ 组织架构决定…      │
│ ┃ 软件工程原则 · 1d  │
│ ─────────────────────│
│ ┃ Flexbox 居中       │
│ ┃ 含效果预览与…      │
│ ┃ CSS 示例 · 3d     │
│ ─────────────────────│
│ ▼ 全部分类 · 3 篇    │  ← 折叠，展开后紧凑行
│   🖥 原则      2 篇  │
│   🎨 CSS       1 篇  │
└──────────────────────┘
```

### 桌面端（≥768px）

```
┌──────────────────────────────────────┐
│  Nav  ↔  Main 对齐 max-w-5xl         │
├──────────────────────────────────────┤
│  [所有] [原则·2] [CSS·1] [MySQL]     │
│                                      │
│  ┌──────────┐ ┌──────────┐          │
│  │┃ CAP 定理 │ │┃ 康威定律 │          │
│  │┃ 蓝色边框 │ │┃ 蓝色边框 │          │
│  └──────────┘ └──────────┘          │
│  ┌──────────┐                        │
│  │┃ Flexbox  │                        │
│  │┃ 紫色边框 │                        │
│  └──────────┘                        │
│                                      │
│  ▼ 全部分类 · 3 篇                   │
└──────────────────────────────────────┘
```

### 交互功能

- **Pills 过滤**：点击 Pill → 下方文章实时筛选，当前选中高亮
- **全部分类折叠**：点击展开/收起分类列表
- **文章卡片**：点击直达文章（不经过分类页）
- **分类色条**：每个分类不同边框色（蓝/紫/绿/红/琥珀）

---

## 添加新内容

### 新建分类 + 文章

```bash
# 两步完成
mkdir src/content/knowledge/mysql
nvim src/content/knowledge/mysql/transaction-isolation.mdx
```

**无需修改任何已有文件。**  
构建时自动发现：首页 Pills、首页分类列表、知识列表、搜索索引。

### 新建分类时关注的点

1. **分类图标** — `src/components/HomeFeed.astro` 的 `catIcon()` 和 `accent()` 中加新映射
2. **首页描述** — `src/components/CategoryCardGrid.astro` 已删除，现在是 Feed 布局，不需要
3. **面包屑** — 自动从文章 `category` frontmatter 取显示名

---

## 设计系统

### 风格

Minimalism & Swiss Style — 洁净、留白、功能主义。

### 颜色

| Token | Light | Dark |
|---|---|---|
| Background | `#F8FAFC` (slate-50) | `#0F172A` (slate-900) |
| Foreground | `#1E293B` (slate-800) | `#F1F5F9` (slate-100) |
| Accent | `#2563EB` (blue-600) | `#60A5FA` (blue-400) |
| Border | `#E2E8F0` (slate-200) | `#334155` (slate-700) |

暗色模式通过 `<html class="dark">` 控制，`localStorage` 持久化，FOUC prevention 在 `<head>` inline script。

### 分类色条

| 分类 | 色值 |
|---|---|
| 软件工程原则 | `border-l-blue-500` |
| CSS 示例 | `border-l-purple-500` |
| MySQL | `border-l-emerald-500` |
| Redis | `border-l-red-500` |
| 工程师心得 | `border-l-amber-500` |

映射在 `src/components/HomeFeed.astro` 的 `accent()` 函数中维护。

### 字体

- Body: `IBM Plex Sans` (Google Fonts)
- Code: `JetBrains Mono` (Google Fonts)

### 图标

使用 **Lucide** SVG 图标，禁止使用 emoji 作为结构性图标。

---

## 命令列表

```bash
pnpm dev              # 开发服务器 :4321
pnpm build            # 完整构建 (含 Pagefind 索引)
pnpm preview          # 预览构建产物
pnpm check            # TypeScript 类型检查
pnpm format           # Prettier 格式化全部文件
pnpm format:check     # 格式化检查 (CI)
```

---

## CI/CD

**GitHub Actions** (`.github/workflows/ci.yml`)：
- push/PR 到 main → typecheck + build
- main → 自动部署到 GitHub Pages（备选通道）

**Vercel**：连接 GitHub 仓库，main push 自动构建部署到 `keep.vercel.app`。

---

## 设计决策记录

| 决策 | 理由 |
|---|---|
| Content Collections 替代 pages MDX | 数据驱动，schema 校验，自动查询 |
| `[...slug].astro` 动态路由 | 新增分类/文章零配置 |
| 首页 Feed 替代卡片 Grid | 移动端优先，首屏见内容而非空分类类 |
| Pills 横向滚动 + JS 过滤 | 原生手势，30+ 分类不占空间 |
| 文章卡片直链（跳过分类页） | 减少点击路径 |
| `wide` prop 布局切换 | 首页宽版（2 列），文章页窄版（阅读宽度） |
| `class:list` 而不是字符串内插 | Astro 标准做法，避免模板字面量陷阱 |

---

## 未完成 / 可改进

| 事项 | 优先级 | 备注 |
|---|---|---|
| 内容填充 | 持续 | 当前仅 3 篇，需要持续填充 |
| 标签筛选 | 中 | 利用已有 `tags`，加标签列表页或文章底部标签 |
| 搜索优化 | 中 | 添加 `data-pagefind-body` 标记优化索引范围 |
| 相关文章推荐 | 低 | 按共享 tags 推荐同类文章 |
| RSS | 低 | `@astrojs/rss` 生成订阅源 |
| 自定义域名 | 低 | Vercel Settings → Domains |
| 分类图标/色值配置化 | 低 | 当前硬编码在组件中，可提取为配置文件 |
| 更新时间显示 | 低 | `updated` 字段已在前置数据中，未在前端展示 |

---

## 联系

**作者**：Jkortex  
**仓库**：`https://github.com/Jkortex/keep`

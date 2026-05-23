# Keep — Agent Guide

## Project Overview

个人/团队知识记录平台。基于 Astro Content Collections 的数据驱动架构。

## Tech Stack

| 层 | 技术 |
|---|---|
| 框架 | Astro 6 (SSG) |
| 内容 | MDX via Astro Content Collections |
| 样式 | Tailwind CSS v4 (`@tailwindcss/vite`) |
| 类型 | TypeScript 6 (strict) |
| 包管理 | pnpm 11 |
| 格式化 | Prettier 3 + `prettier-plugin-astro` |
| 搜索 | Pagefind (构建时索引) |
| 代码高亮 | Shiki 4 |
| Sitemap | `@astrojs/sitemap` |
| 部署 | Vercel (自动) |

## Architecture

```
src/
├── content/
│   ├── config.ts              # Zod schema for knowledge collection
│   └── knowledge/
│       ├── principles/
│       │   ├── cap-theorem.mdx
│       │   └── conways-law.mdx
│       ├── css/
│       │   ├── flexbox.mdx
│       │   └── flexbox.css
│       ├── mysql/              # 新分类直接加目录
│       ├── redis/
│       └── engineering/
│
├── components/
│   ├── AllKnowledge.astro        # /knowledge 全知识列表（自动分组）
│   ├── ArticleCard.astro         # 文章链接卡片
│   ├── Breadcrumbs.astro         # 面包屑导航（自动发现分类名）
│   ├── CategoryCardGrid.astro    # 首页分类网格（自动发现分类）
│   ├── CategoryListing.astro     # 单分类文章列表页
│   └── CodeDemo.astro            # CSS 示例: 预览 + 源码 (Shiki 高亮)
│
├── layouts/
│   └── Layout.astro              # 全局布局 (nav, theme toggle, footer)
│
├── pages/
│   ├── index.astro               # 首页 — 自动发现分类
│   ├── search.astro              # 全文搜索
│   └── knowledge/
│       ├── index.astro           # /knowledge — 所有分类/文章
│       └── [...slug].astro       # 动态路由: 分类页 / 文章页
│
└── styles/
    └── app.css                   # 全局样式 + Tailwind theme tokens

src/content.config.ts              # Content Collections 配置
```

### 路由规则

```
/knowledge                          → knowledge/index.astro (全知识列表)
/knowledge/principles               → [...slug].astro      (分类页)
/knowledge/principles/cap-theorem   → [...slug].astro      (文章页)
/knowledge/css                      → [...slug].astro      (分类页)
/knowledge/css/flexbox              → [...slug].astro      (文章页)
```

分类 slug 由 `src/content/knowledge/` 下的子目录名决定，**自动发现**。

### 内容类型

**纯知识页面** — 直接在 MDX 中写 Markdown：

```mdx
---
title: CAP 定理
category: 软件工程原则
description: Consistency、Availability、Partition Tolerance
tags: [分布式, 数据库, 理论]
order: 1
---

正文用纯 Markdown 即可…
```

**CSS 示例页面** — 使用 `<CodeDemo>` 展示效果+源码：

```mdx
---
title: CSS Flexbox 居中
category: CSS 示例
description: 使用 Flexbox 实现水平和垂直居中
tags: [CSS, 布局, Flexbox]
order: 1
---

import CodeDemo from '../../../components/CodeDemo.astro';
import './flexbox.css';

说明文字…

<CodeDemo code={源码字符串} lang="html">
  <div class="demo">实际渲染内容</div>
</CodeDemo>
```

### Frontmatter Schema

```ts
{
  title: z.string(),              // 文章标题
  category: z.string(),           // 分类显示名，如 "软件工程原则"
  description: z.string().optional(), // 摘要
  tags: z.array(z.string()).optional().default([]),  // 标签
  order: z.number().optional().default(0),  // 同分类排序权重
  created: z.date().optional(),   // 创建日期
  updated: z.date().optional(),   // 更新日期
}
```

## 添加新内容流程

### 新建分类

只需两步：

```bash
mkdir src/content/knowledge/<分类目录>
# 写 .mdx 文件
```

**不需要**改任何路由、组件、配置文件。自动出现在首页、知识列表、搜索索引中。

### 新建文章

在对应分类目录下创建 `.mdx` 文件，按 frontmatter schema 填写元数据。

- CSS 示例需在同目录放 `.css` 文件，MDX 中 import
- 纯知识页面不需要额外组件

## Design System

### 风格
Minimalism & Swiss Style — 洁净、留白、功能主义、无装饰。

### 颜色
```
Primary     #475569  (slate-600)
Accent      #2563EB  (blue-600)
Background  #F8FAFC  (slate-50)
Foreground  #1E293B  (slate-800)
Border      #E2E8F0  (slate-200)
```
暗色模式自动切换，通过 `.dark` class 控制。

### 字体
- Body: `IBM Plex Sans` (Google Fonts)
- Code: `JetBrains Mono` (Google Fonts)

### 图标
使用 **Lucide** SVG 图标，禁止使用 emoji 作为结构性图标。
分类图标映射在 `src/components/CategoryCardGrid.astro` 的 `CATEGORY_ICONS` 中维护。

## Commands

```bash
pnpm dev             # 开发服务器 :4321
pnpm build           # 构建 + Pagefind 索引
pnpm preview         # 预览构建结果
pnpm check           # TypeScript 类型检查
pnpm format          # Prettier 格式化
pnpm format:check    # 格式化检查 (CI)
```

## Conventions

### 代码风格
- 分号: `semi: true`
- 引号: `singleQuote: true`
- 尾逗号: `trailingComma: all`
- 缩进: 2 spaces
- 行宽: 100 chars

### TypeScript
- `tsconfig.json` extends `astro/tsconfigs/strict`
- 共享类型定义在 `src/types.ts`
- Layout Props 使用 `extends Partial<PageMeta>`
- 组件 Props 使用 interface + `Astro.props as Props` 模式

### 命名
- 组件: PascalCase
- 文件/目录: kebab-case
- 类型: PascalCase

### 样式
- Tailwind utility classes 优先
- 全局 prose 样式在 `app.css` 中定义
- 自定义 CSS 使用 `@theme` tokens (`bg-brand-50`, `text-brand-600`)

## Key Design Decisions

- **Content Collections**：所有知识文章在 `src/content/knowledge/` 下，按分类分目录
- **动态路由**：`[...slug].astro` 统一处理分类页和文章页，新增内容零配置
- **数据驱动**：首页、知识列表、分类页都通过 `getCollection()` 自动查询
- **面包屑自动**：从 content collection 元数据自动发现分类显示名
- **暗色主题**：class-based，localStorage 持久化，FOUC prevention
- **搜索**：Pagefind 构建时索引，浏览器端查询
- **无数据库**：文件系统即知识库，git 即版本控制
- **无用户系统**：个人→小团队场景

## Related Docs

- `docs/HANDOVER.md` — 交接文档
- `docs/ideas/knowledge-keep.md` — 原始方案文档
- `.github/workflows/ci.yml` — CI/CD 流程
- `src/content.config.ts` — 数据结构和 schema

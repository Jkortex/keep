# Keep — Agent Guide

## Project Overview

个人/团队知识记录平台。两种内容共存：
- **纯知识页面**：CAP 定理、康威定律等 — 写 `.mdx`，零组件
- **CSS 示例页面**：效果预览 + 源码展示 — `.mdx` + `<CodeDemo>` 组件

## Tech Stack

| 层 | 技术 |
|---|---|
| 框架 | Astro 6 |
| 内容 | MDX |
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
├── components/
│   ├── Breadcrumbs.astro      # 面包屑导航 (auto from URL)
│   ├── CategoryCard.astro     # 首页分类卡片
│   └── CodeDemo.astro         # CSS 示例: 预览 + 源码 (Shiki 高亮)
├── layouts/
│   └── Layout.astro           # 全局布局 (nav, theme toggle, footer)
├── pages/
│   ├── index.astro            # 首页
│   ├── search.astro           # 全文搜索
│   └── knowledge/
│       ├── index.astro        # 所有知识列表
│       ├── css/
│       │   └── flexbox.mdx    # CSS 示例页 (含 CodeDemo)
│       └── principles/
│           ├── index.astro    # 原则列表
│           ├── cap-theorem.mdx
│           └── conways-law.mdx
└── styles/
    └── app.css                # 全局样式 + Tailwind theme tokens
```

### 内容类型

**纯知识页面** — 直接写 MDX，不需要额外组件：
```mdx
---
layout: ../../../layouts/Layout.astro
title: CAP 定理
---

# CAP 定理

正文用纯 Markdown 即可…
```

**CSS 示例页面** — 使用 `<CodeDemo>` 展示效果+源码：
```mdx
---
layout: ../../../layouts/Layout.astro
title: CSS Flexbox 居中
---

import CodeDemo from '../../../components/CodeDemo.astro';

正文描述…

<CodeDemo code={源码字符串} lang="html">
  <div class="demo">实际渲染内容</div>
</CodeDemo>
```

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

格式化通过 Prettier 自动执行。VSCode 已配置 format-on-save。

### TypeScript
- `tsconfig.json` extends `astro/tsconfigs/strict`
- 共享类型定义在 `src/types.ts`
- Layout Props 使用 `extends Partial<PageMeta>`
- 组件 Props 使用 interface + `Astro.props as Props` 模式

### Component Props 模式
```astro
---
export interface Props {
  href: string;
  title: string;
}
const { href, title } = Astro.props as Props;
---
```

### 命名
- 组件: PascalCase
- 文件/目录: kebab-case (Astro 项目约定)
- 类型: PascalCase (`CodeDemoProps`, `SourceFile`)

### 样式
- Tailwind utility classes 优先
- 全局 prose 样式在 `app.css` 中定义，有 light/dark 变量
- 自定义 CSS 使用 `@theme` tokens (`bg-brand-50`, `text-brand-600`)

## Content Creation

添加新知识页面的步骤：

1. 在 `src/pages/knowledge/` 下找到对应分类目录，或新建目录
2. 创建 `.mdx` 文件，frontmatter 包含 `layout` 和 `title`
3. 纯知识直接写 Markdown；CSS 示例引入 `<CodeDemo>`
4. 更新对应分类的 `index.astro` 页面，添加链接
5. 如果涉及新分类，还要更新 `src/pages/index.astro` 首页卡片

> 注意：`Layout.astro` 会自动处理面包屑导航（基于 URL 路径），无需手动配置。

## Key Design Decisions

- **MDX 显式导入**：CodeDemo 的源码通过 template literal 传入，不依赖 Vite `?raw`
- **暗色主题**：class-based，localStorage 持久化，FOUC  prevention 在 `<head>` inline script
- **搜索**：构建时 Pagefind 索引，运行时浏览器端查询 `/pagefind/pagefind.js`
- **无数据库**：文件系统即知识库，git 即版本控制
- **无用户系统**：个人→小团队场景，git 就是权限层

## Related Docs

- `docs/ideas/knowledge-keep.md` — 原始方案文档
- `.github/workflows/ci.yml` — CI/CD 流程

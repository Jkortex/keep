# Keep — 交接文档

## 项目定位

个人/小团队知识记录平台。记录软件工程原则、架构理论、CSS 示例等技术思考。

生产地址：https://keep.vercel.app  
源码仓库：`git@github.com:Jkortex/keep.git`

---

## 开发环境

```bash
git clone git@github.com:Jkortex/keep.git
cd keep
pnpm install        # 安装依赖
pnpm dev            # 开发 → http://localhost:4321
pnpm build          # 构建 + Pagefind 搜索索引
pnpm preview        # 预览构建产物
pnpm check          # TypeScript 类型检查
pnpm format         # Prettier 格式化全部文件
```

**要求**：Node ≥ 22.12, pnpm 11

---

## 技术栈

| 层 | 技术 | 说明 |
|---|---|---|
| 框架 | Astro 6 | SSG，输出纯静态 HTML |
| 内容 | MDX via Content Collections | 文件系统即知识库 |
| 样式 | Tailwind CSS v4 | via `@tailwindcss/vite` 插件 |
| 类型 | TypeScript 6 (strict) | `pnpm check` 验证 |
| 搜索 | Pagefind | 构建时索引，浏览器端查询 |
| 代码高亮 | Shiki 4 | CodeDemo 源码着色 |
| 格式化 | Prettier 3 + `prettier-plugin-astro` | 保存自动格式化 |
| 部署 | Vercel | 连接 GitHub，push 即部署 |

---

## 项目结构

```
keep/
├── AGENT.md                           # AI agent 上下文说明
├── src/content.config.ts              # Content Collections schema
├── src/content/
│   └── knowledge/                     # 所有知识文章（按分类分目录）
│       ├── principles/
│       │   ├── cap-theorem.mdx
│       │   └── conways-law.mdx
│       ├── css/
│       │   ├── flexbox.mdx
│       │   └── flexbox.css
│       ├── mysql/                     # (待填充)
│       ├── redis/                     # (待填充)
│       └── engineering/               # (待填充)
├── src/components/
│   ├── AllKnowledge.astro             # 全知识列表（自动分组）
│   ├── ArticleCard.astro              # 文章链接卡片
│   ├── Breadcrumbs.astro              # 面包屑（自动发现分类名）
│   ├── CategoryCardGrid.astro         # 首页分类网格（自动发现）
│   ├── CategoryListing.astro          # 单分类文章列表页
│   └── CodeDemo.astro                 # 预览+源码展示 (Shiki 高亮)
├── src/layouts/
│   └── Layout.astro                   # 全局布局 (nav, 面包屑, 主题切换, footer)
├── src/pages/
│   ├── index.astro                    # 首页（自动发现分类）
│   ├── search.astro                   # 搜索页 (Pagefind)
│   └── knowledge/
│       ├── index.astro                # /knowledge — 全知识列表
│       └── [...slug].astro            # 动态路由：分类页 / 文章页
├── src/styles/
│   └── app.css                        # 全局样式 + Tailwind tokens
├── src/types.ts                       # 共享类型定义
├── public/
│   ├── favicon.svg / .ico
│   └── robots.txt
├── astro.config.mjs                   # Astro 配置 (MDX, Sitemap, Tailwind)
├── .prettierrc                        # Prettier 配置
├── .editorconfig                      # 编辑器一致性配置
└── package.json
```

---

## 数据驱动架构

### Content Collections

所有知识文章以 MDX 形式存放在 `src/content/knowledge/` 下，按分类分目录。  
Schema 定义在 `src/content.config.ts`，每个 MDX 文件必须包含以下 frontmatter：

```yaml
---
title: CAP 定理              # 文章标题
category: 软件工程原则        # 分类显示名
description: Consistency…     # 摘要（可选）
tags: [分布式, 数据库]        # 标签（可选）
order: 1                     # 排序权重（可选）
created: 2024-01-15          # 创建日期（可选）
---
```

### 路由规则

| URL | 处理 | 说明 |
|---|---|---|
| `/` | `index.astro` | 首页分类网格（自动发现） |
| `/knowledge` | `knowledge/index.astro` | 全知识列表（自动分组） |
| `/knowledge/:category` | `[...slug].astro` | 分类文章列表页 |
| `/knowledge/:category/:article` | `[...slug].astro` | 文章详情页 |
| `/search` | `search.astro` | 全文搜索 |

### 自动发现机制

- **首页分类**：`CategoryCardGrid.astro` 通过 `getCollection('knowledge')` 自动获取所有分类和文章数
- **知识列表**：`AllKnowledge.astro` 按 frontmatter 的 `category` 字段自动分组
- **面包屑**：`Breadcrumbs.astro` 从 content collection 元数据自动查找分类显示名
- **搜索索引**：Pagefind 构建时自动索引所有 HTML

### 添加新内容流程

```bash
# 1. 新建分类（首次）
mkdir src/content/knowledge/mysql

# 2. 创建文章
nvim src/content/knowledge/mysql/transaction-isolation.mdx
```

**无需修改任何已有文件。** 构建时自动发现并生成对应页面。

---

## 两种内容模式

### 纯知识页面（如 CAP 定理）

创建 `.mdx` 文件，填写 frontmatter + Markdown 正文：

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

### CSS 示例页面（如 Flexbox）

```mdx
---
title: CSS Grid 布局
category: CSS 示例
description: 使用 Grid 实现二维布局
tags: [CSS, 布局, Grid]
order: 2
---

import CodeDemo from '../../../components/CodeDemo.astro';

说明文字…

<CodeDemo code={源码HTML字符串} lang="html">
  <div class="demo">实际渲染的 HTML</div>
</CodeDemo>
```

> 页面样式写在同目录的 `.css` 文件中，MDX 里 `import './xxx.css'`。

---

## 设计要点

### 主题（亮/暗）
- class-based 暗色模式，通过 `<html class="dark">` 切换
- 首次访问遵循系统 `prefers-color-scheme`
- 用户点击右上角 🌙/☀️ 按钮后持久化到 `localStorage('theme')`
- FOUC 防闪烁脚本内联在 `<head>` 最前面

### 搜索
- 构建时 `pnpm build` 自动执行 `npx pagefind --site dist`
- 索引输出到 `dist/pagefind/`
- 搜索页 `/search` 使用 native dynamic import 加载 `pagefind.js`
- 输入带 150ms debounce

### 代码高亮
- CodeDemo 使用 Shiki `github-dark` 主题
- 高亮在构建时 Astro 组件中异步完成

### 面包屑
- 自动基于 URL 路径生成
- 分类显示名从 content collection 元数据自动获取
- 文章标题从 frontmatter 自动获取
- 无需手动配置

---

## 关键命令行

```bash
pnpm dev              # 日常开发
pnpm build            # 完整构建 (含搜索索引)
pnpm format           # 格式化全部文件
pnpm check            # 类型检查 (提交前必做)
```

---

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`)：
- push/PR 到 main → 自动 typecheck + build
- main 分支 → 自动部署到 GitHub Pages

Vercel 连接了 GitHub 仓库，main 分支 push 会自动构建部署到生产环境。  
两者不冲突，GitHub Pages 是备选部署通道。

---

## 未完成 / 可改进

| 事项 | 优先级 | 备注 |
|---|---|---|
| 更多知识条目 | 持续 | 需要持续填充内容 |
| 标签筛选系统 | 中 | 利用已有 `tags` 字段，添加标签列表页和筛选 |
| 图表/图示 | 低 | CAP 定理如果有维恩图会更清晰，可用 Mermaid 或图片 |
| 双向链接 | 低 | wiki 风格 `[[link]]` 需要 remark 插件 |
| 自定义域名 | 低 | Vercel 项目 Settings → Domains 绑定 |
| RSS | 低 | `@astrojs/rss` 可生成订阅源 |
| 分类图标自定义 | 低 | 当前 `CategoryCardGrid.astro` 中硬编码图标映射 |
| 分类描述自定义 | 低 | 当前 `CategoryCardGrid.astro` 中硬编码描述文本 |

---

## 联系

项目作者：Jkortex  
仓库：https://github.com/Jkortex/keep

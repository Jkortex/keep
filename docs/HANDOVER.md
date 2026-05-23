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
| 内容 | MDX | 知识页面即文件 |
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
├── AGENT.md                           # AI agent 上下文说明（新接手先读这个）
├── docs/
│   ├── ideas/knowledge-keep.md        # 原始方案文档
│   └── HANDOVER.md                    # 本文件
├── src/
│   ├── components/
│   │   ├── Breadcrumbs.astro          # 面包屑导航
│   │   ├── CategoryCard.astro         # 首页分类卡片
│   │   └── CodeDemo.astro             # 预览+源码展示 (Shiki 高亮)
│   ├── layouts/
│   │   └── Layout.astro               # 全局布局 (nav, 面包屑, 主题切换, footer)
│   ├── pages/
│   │   ├── index.astro                # 首页
│   │   ├── search.astro               # 搜索页 (Pagefind)
│   │   └── knowledge/
│   │       ├── index.astro            # 所有知识列表
│   │       ├── css/
│   │       │   ├── flexbox.mdx        # CSS 示例页
│   │       │   └── flexbox.css
│   │       └── principles/
│   │           ├── index.astro        # 原则列表
│   │           ├── cap-theorem.mdx
│   │           └── conways-law.mdx
│   ├── styles/
│   │   └── app.css                    # 全局样式 + Tailwind tokens
│   └── types.ts                       # 共享类型定义
├── public/
│   ├── favicon.svg / .ico
│   └── robots.txt
├── astro.config.mjs                   # Astro 配置 (MDX, Sitemap, Tailwind)
├── .prettierrc                        # Prettier 配置
├── .editorconfig                      # 编辑器一致性配置
└── package.json
```

---

## 两种内容模式

### 纯知识页面（如 CAP 定理）

创建 `.mdx` 文件，frontmatter + Markdown 正文：

```mdx
---
layout: ../../../layouts/Layout.astro
title: SOLID 原则
---

# SOLID 原则

正文直接用 Markdown…
```

### CSS 示例页面（如 Flexbox）

```mdx
---
layout: ../../../layouts/Layout.astro
title: CSS Grid 布局
---

import CodeDemo from '../../../components/CodeDemo.astro';

说明文字…

<CodeDemo code={源码HTML字符串} lang="html">
  <div class="demo">实际渲染的 HTML</div>
</CodeDemo>
```

> 页面样式写在同目录的 `.css` 文件中，MDX 里 `import './xxx.css'`。

### 添加新分类

1. `src/pages/knowledge/<分类>/` 下创建 `.mdx` 文件
2. 更新该目录的 `index.astro` 添加条目链接
3. 如果是全新分类，在 `src/pages/index.astro` 加一个 `<CategoryCard>`
4. 面包屑导航是自动的，无需手动配置

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
- 基于 `Astro.url.pathname` 自动生成
- 路径段 → 显示名映射在 `Breadcrumbs.astro` 的 `labels` 对象中
- 添加新目录时需要更新 `labels` 映射

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
| 更多知识条目 | 持续 | 当前只有 3 篇，内容库需要持续填充 |
| 标签系统 | 低 | 可以在 frontmatter 加 `tags`，然后用 `getCollection()` 筛选 |
| 图表/图示 | 低 | CAP 定理如果有维恩图会更清晰，可用 Mermaid 或图片 |
| 双向链接 | 低 | wiki 风格 `[[link]]` 需要 remark 插件 |
| 自定义域名 | 低 | Vercel 项目 Settings → Domains 绑定 |
| RSS | 低 | `@astrojs/rss` 可生成订阅源 |

---

## 联系

项目作者：Jkortex  
仓库：https://github.com/Jkortex/keep

# Knowledge Keep — 知识记录平台

## Problem Statement
How Might We 构建一个知识记录平台，让纯文本知识（原则/定理）和带渲染示例的知识（CSS 效果 + 源码）能以统一、简洁的方式共存，且维护成本和阅读体验都令人满意？

## Recommended Direction
**Astro + MDX** 为核心框架，搭配约定式文件组织与一个可复用的 `<CodeDemo>` 组件。

架构哲学：
- **纯知识页面** = 写 `.md`，零额外工作
- **CSS 示例页面** = `.mdx` + `<CodeDemo>` 组件，demo 组件与源码共存于目录中
- **构建输出** = 静态 HTML，默认零 JS，页面秒开

核心模式：

```
knowledge/
  css/
    flexbox.md                          # 文章正文（MDX）
    flexbox/
      center.tsx                        # Demo 组件
      center.tsx?raw                    # Vite raw 导入源码
  principles/
    cap-theorem.md                      # 纯 Markdown
    conways-law.md
```

页面中：

```mdx
---
import { CodeDemo } from '~/components/CodeDemo.astro'
import Center from './flexbox/center.tsx'
import centerCode from './flexbox/center.tsx?raw'
---

<CodeDemo code={centerCode}>
  <Center />
</CodeDemo>
```

## Key Assumptions to Validate
- [ ] 团队成员（或未来的你）是否能无障碍理解 MDX + `?raw` 的模式
- [ ] 100+ 篇内容时 Astro 构建时间是否仍在可接受范围（第 2 次开始增量构建应 < 3s）
- [ ] 如果需要搜索，Pagefind 是否能满足中文分词需求

## MVP Scope
- [x] Astro + MDX 项目初始化，content collection 配置
- [x] `<CodeDemo>` 组件：响应式布局（桌面左右，移动端上下）
- [x] 第一个纯知识页面（CAP 定理）验证纯 MD 流程
- [x] 第一个 CSS 示例页面（Flexbox 居中）验证 demo + code 流程
- [ ] 部署到 Vercel / Cloudflare Pages

## Not Doing (and Why)
- **运行时编辑/交互** — 静态 demo 已满足需求，CodeSandbox 类方案不必要地增加复杂度
- **用户系统/权限** — 个人→小团队场景，git 就是权限层，过早上 CMS 是过度工程
- **自定义主题系统** — Astro 默认主题 + 少量 CSS 变量即可，不需要主题换肤
- **数据库** — 文件系统就是数据库，git 就是版本控制，不需要 PostgreSQL/SQLite
- **内容 API** — 不需要对外提供 REST API，SSG 直接产生 HTML 页面

## 全文搜索推荐
**首选 Pagefind**（Astro 官方推荐，零配置）。如内容少于 50 篇，直接用 fetch + 前端过滤更简单。

## Open Questions
- 是否需要支持图片/图表（如 CAP 定理的维恩图）？如果需要，如何处理图片资源？
- 知识条目之间是否需要交叉引用/双向链接？
- 最终部署在哪个平台？（影响构建命令和适配器选择）

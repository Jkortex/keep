# Keep

知识记录平台 — 记录软件工程原则、架构理论、CSS 示例与技术思考。

## 技术栈

- **框架:** [Astro](https://astro.build) 6 + MDX
- **样式:** [Tailwind CSS](https://tailwindcss.com) v4
- **类型:** TypeScript 6 (strict)
- **包管理:** pnpm 11

## 快速开始

```bash
pnpm install
pnpm dev       # 开发服务器 → http://localhost:4321
pnpm build     # 构建到 dist/
pnpm preview   # 预览构建结果
pnpm check     # 类型检查
```

## 内容组织

```
src/pages/knowledge/
├── principles/          # 纯知识：CAP、康威定律等
│   ├── cap-theorem.mdx
│   └── conways-law.mdx
└── css/                # CSS 示例：含预览 + 源码
    └── flexbox.mdx
```

- **纯知识页面**：直接写 `.mdx`，Markdown 即可
- **CSS 示例页面**：`.mdx` + `<CodeDemo>` 组件，效果预览与源码并排展示

## CI/CD

- **CI:** GitHub Actions — push/PR 自动类型检查 + 构建
- **部署:** 支持 GitHub Pages / Vercel / Netlify / Cloudflare Pages 免费部署

## 部署

一键部署到免费平台：

| 平台                                             | 构建命令                        | 发布目录 | 备注                   |
| ------------------------------------------------ | ------------------------------- | -------- | ---------------------- |
| [Vercel](https://vercel.com)                     | `pnpm build`                    | `dist/`  | 最推荐，Astro 原生支持 |
| [Netlify](https://netlify.com)                   | `pnpm build`                    | `dist/`  | 同样方便               |
| [Cloudflare Pages](https://pages.cloudflare.com) | `pnpm build`                    | `dist/`  | 全球 CDN               |
| GitHub Pages                                     | 通过 `.github/workflows/ci.yml` | `dist/`  | 免费，需配置 `base`    |

> 提示：Vercel / Netlify 连接到 GitHub 仓库后自动部署，无需手动配置 CI。

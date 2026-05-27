# `@xkit/hotkeys` 执行计划

## 当前状态

这份计划文档已从“待实施方案”更新为“当前落地结果”。

当前实现已经完成：

- 新建 `@xkit/hotkeys` package
- `core / extensions / vue adapter` 三层结构
- `daily/web` 接入与迁移
- `app/root` 顶层上下文
- 单命令单 handler 模型
- 路径匹配、深层优先、`dialog.open` 粗粒度阻断

## 已落地的关键决策

### 1. 包结构

`@xkit/hotkeys` 当前结构：

- `core`
  命令、binding、context、snapshot、keydown dispatch
- `extensions`
  command palette 等可选状态机
- `vue adapter`
  `createHotkeyPlugin`、`useCtx`、`useCmd`、`useCommandPalette`

### 2. 命令模型

当前使用：

- 静态 command metadata
- 静态 bindings
- 动态唯一 handler

不再使用：

- 同命令多 handler 解析
- handler `context matcher`
- handler `priority`

### 3. Context 模型

运行时维护激活路径，而不是平面 scope。

`daily/web` 当前主路径：

- `app/root`
- `page/home`
- `dialog/memo-editor`
- `overlay/command-palette`

### 4. 匹配规则

binding 当前按以下顺序解析：

1. `mode`
2. `when(snapshot)`
3. `contextPath` 命中
4. sequence 前缀/精确匹配
5. `priority`
6. 匹配深度
7. 注册顺序

同一路径上更深层的 binding 会覆盖更浅层节点。

### 5. 业务命名

`daily/web` 当前已采用业务唯一命名：

- `app.*`
- `home.*`

这替代了早期更泛化的 `nav.* / memo.* / palette.*` 风格。

## `daily/web` 当前迁移结果

### 全局层

`app/root` 承载全局入口：

- `app.nav.home`
- `app.nav.stats`
- `app.nav.admin_invites`
- `app.nav.random_walk`
- `app.account_menu.toggle`
- `app.auth.switch_user`
- `app.command_palette.open`

对应静态 binding 位于：

- `packages/daily/web/src/presentation/hotkeys/appRootHotkeys.ts`

### Home 层

Home 页面承载页面内命令：

- `home.memo.create`
- `home.search.focus`
- `home.memo.select_next`
- `home.memo.select_prev`
- `home.memo.edit_selected`
- `home.memo.delete_selected`
- `home.shortcuts.toggle`
- `home.tag_governance.open`
- `home.backup.import`
- `home.backup.export`
- `home.editor.close`
- `home.editor.toggle_expand`

对应静态 binding 位于：

- `packages/daily/web/src/presentation/hotkeys/homeHotkeys.ts`

### Dialog 阻断

`daily/web` 当前通过 `dialog.open` 粗粒度 flag 控制：

- dialog 打开时，`app/root` 命令入口不会穿透
- Home 页面级命令也会通过 `when: !dialog.open` 被阻断
- dialog 自己内部保留必要命令，如 `home.editor.close`

## 当前测试状态

### `@xkit/hotkeys`

覆盖：

- context manager
- keybinding helpers
- runtime
- command palette extension
- Vue context inheritance

### `daily/web`

覆盖：

- Home 页面快捷键与命令面板
- Editor / Palette 输入接管
- 非 Home 路由下的 `app/root` 快捷键

当前验证命令：

- `pnpm format:ox:fix`
- `pnpm lint:ox`
- `pnpm --filter @xkit/hotkeys test`
- `pnpm -C packages/daily/web test`
- `pnpm -C packages/daily/web build`

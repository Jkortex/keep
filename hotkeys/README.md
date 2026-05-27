# @xkit/hotkeys

Workspace package for application-level commands, keybindings, and context-aware
input handling.

## Current Status

- Vite library build
- `core / extensions / vue adapter` structure
- `contextPath + mode + flags + pendingSequence` runtime model
- single-command single-handler execution model
- path-based binding matching with deeper-context priority
- command palette extension
- `daily/web` migration completed

## Key Decisions

- Commands are registered statically at app startup
- Bindings are registered statically at app startup
- Components register context nodes with `useCtx()`
- Components register the unique implementation for a command with `useCmd()`
- Runtime matches bindings along the active path and prefers deeper nodes
- Cross-cutting blocking state is expressed with `flags`, for example `dialog.open`

## `daily/web` Integration

Current `daily/web` structure uses:

- `app/root` for app-wide commands
- `page/home` for Home page commands
- `dialog/memo-editor` for editor commands
- `overlay/command-palette` for palette interaction

Command ids are business-scoped:

- `app.*`
- `home.*`

## Documentation

- Design: `docs/design.md`
- Execution status: `docs/execution-plan.md`

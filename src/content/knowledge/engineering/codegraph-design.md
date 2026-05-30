---
title: codegraph — 代码知识图谱 CLI 封装与 AI 代理集成
category: 工程实践
description: 为 AI 编程代理提供代码语义搜索、调用链分析、影响分析的统一接口
tags: [TypeScript, 代码分析, 知识图谱, Pi, OpenCode, 架构]
order: 0
created: 2025-05-30
---

## 背景

AI 编程代理（Pi、OpenCode）在理解代码库时，通常需要反复执行 `grep`、`read` 来建立上下文。`codegraph` 是一个代码知识图谱工具，提供语义搜索、调用图、影响分析等功能，但它的原生 CLI 接口对 AI 工具调用不够友好。

`@xkit/codegraph` 的核心任务：**将 codegraph CLI 封装为类型安全的 TypeScript API，再适配为 Pi 和 OpenCode 两个 AI 代理平台的可调用工具。**

## 架构：三层适配

```
┌──────────────────────────────────────┐
│      Pi Extension (pi/extension.ts)  │  ← 平台适配层
│  事件监听、命令注册、自动初始化       │     依赖 @earendil-works/pi-coding-agent
├──────────────────────────────────────┤
│    OpenCode Plugin (opencode/plugin.ts)│  ← 平台适配层
│  工具定义、参数校验、错误格式化        │     依赖 @opencode-ai/plugin
├──────────────────────────────────────┤
│      CodeGraphCLI (src/cli.ts)        │  ← 核心封装层
│  CLI 进程封装、JSON 解析、类型输出     │     零外部依赖
├──────────────────────────────────────┤
│   codegraph CLI (@colbymchenry/codegraph)│  ← 外部依赖
│  代码索引、语义搜索、调用图计算        │     npm install -g
└──────────────────────────────────────┘
```

## CodeGraphCLI — CLI 封装层

### 类型系统

定义 7 个核心类型，覆盖 codegraph CLI 的所有输出格式：

```typescript
interface CodeGraphNode {
  id: string;
  kind: string;           // function, class, method, variable...
  name: string;
  qualifiedName: string;
  filePath: string;
  startLine: number;
  endLine: number;
  language: string;
  isExported: boolean;
  visibility: string;
}

interface SearchResult extends CodeGraphNode {
  score: number;          // 语义相关性分数
}

interface CallersResult {
  symbol: string;
  callers: CallerCalleeItem[];
}

interface CalleesResult {
  symbol: string;
  callees: CallerCalleeItem[];
}

interface ImpactResult {
  symbol: string;
  impactedNodes: Array<{ node: CodeGraphNode; edge: any }>;
  totalImpacted: number;
}

interface StatusResult {
  initialized: boolean;
  projectPath: string;
  fileCount: number;
  nodeCount: number;
  edgeCount: number;
  dbSizeBytes: number;
}
```

### 核心封装模式

`CodeGraphCLI` 类封装 `child_process.execFile`，提供 8 个公开方法：

| 方法 | CLI 命令 | 用途 |
|------|----------|------|
| `isAvailable()` | `codegraph --version` | CLI 是否存在 |
| `isInitialized()` | `codegraph status --json` | 项目是否已索引 |
| `init()` | `codegraph init -i` | 初始化索引 |
| `index()` | `codegraph index --quiet` | 索引代码库 |
| `sync()` | `codegraph sync --quiet` | 增量同步 |
| `query(search, opts?)` | `codegraph query <s> --json` | 语义搜索符号 |
| `context(task, opts?)` | `codegraph context <t> --format markdown` | 任务相关上下文 |
| `callers(symbol)` | `codegraph callers <s> --json` | 查找调用者 |
| `callees(symbol)` | `codegraph callees <s> --json` | 查找被调用者 |
| `impact(symbol)` | `codegraph impact <s> --json` | 影响分析 |
| `status()` | `codegraph status --json` | 索引状态 |

### 依赖注入测试模式

构造函数接受可选的 `execSyncMock` 参数，使测试能够在无实际 CLI 的环境下运行：

```typescript
export class CodeGraphCLI {
  constructor(
    private projectRoot: string,
    private execSyncMock?: (args: string[]) => string,
  ) {}

  private exec(args: string[]): Promise<string> {
    if (this.execSyncMock) return this.execSyncMock(args);
    return execFile('codegraph', args, { cwd: this.projectRoot });
  }
}
```

### 错误处理

两个自定义错误类，区分"CLI 未安装"和"项目未索引"两种场景：

```typescript
class CodeGraphNotFoundError extends Error {
  constructor() {
    super('codegraph CLI 未安装，请执行 npm i -g @colbymchenry/codegraph');
  }
}

class CodeGraphNotInitializedError extends Error {
  constructor() {
    super('项目未索引，请先执行 init()');
  }
}
```

## Pi 集成（pi/extension.ts）

### 外部存储策略

codegraph 索引数据较大，不应存入项目目录。Pi 集成通过**外部存储 + 符号链接**策略解决：

```typescript
function codegraphStoreDir(projectRoot: string): string {
  const hash = createHash('sha256')
    .update(resolve(projectRoot))
    .digest('hex')
    .slice(0, 16);
  return `${os.homedir()}/.local/share/xkit/codegraph/${hash}`;
}

function ensureCodegraphSymlink(projectRoot: string): void {
  // 创建 $projectRoot/.codegraph → ~/.local/share/xkit/codegraph/<hash> 的符号链接
  // 如果 .codegraph/ 已是正确链接 → 跳过
  // 如果 .codegraph/ 是真实目录 → 保留不动（不覆盖用户数据）
}
```

### 自动初始化流程

```
session_start (首次)
    ↓
codegraph CLI 可用？
    ↓              ↓
  是              否 → 提示安装
    ↓
项目有 .codegraph/？
    ↓              ↓
  是              否 → 提示初始化
                       ↓
                   用户同意？
                   ↓        ↓
                  是        否 → 提示 /codegraph_init 命令
                  ↓
          1. 创建外部存储符号链接
          2. codegraph init -i
          3. codegraph index --quiet
```

### 脏跟踪增量同步

通过 `tool_call` 事件监听文件写入操作，当修改的文件是源代码（`.ts`、`.js`、`.py`、`.rs`、`.go` 等 18 种扩展名）时，设置 `dirty` 标志。每次工具执行前检查标志，需要则调用 `sync()` 增量更新：

```typescript
let dirty = false;

pi.on('tool_call', (event) => {
  if (isToolCallEventType(event, 'write') || isToolCallEventType(event, 'edit')) {
    if (isSourceCode(event.params.filePath)) {
      dirty = true;
    }
  }
});

async function ensureFresh(cli: CodeGraphCLI) {
  if (dirty) {
    await cli.sync();
    dirty = false;
  }
}
```

### Pi 工具注册

注册 6 个 AI 可调用工具，每个工具通过 `registerCodegraphTool` 统一模板管理：

| 工具名 | 功能 | 参数 |
|--------|------|------|
| `codegraph_query` | 语义搜索符号 | `search`, `kind?`, `limit?` |
| `codegraph_context` | 构建任务上下文 | `task`, `maxNodes?` |
| `codegraph_callers` | 查找调用者 | `symbol`, `limit?` |
| `codegraph_callees` | 查找被调用者 | `symbol`, `limit?` |
| `codegraph_impact` | 影响分析 | `symbol`, `depth?` |
| `codegraph_status` | 索引状态 | 无 |

## OpenCode 集成（opencode/plugin.ts）

OpenCode 插件提供了相同的 6 个工具，但有不同取舍：

- **更简单**：无符号链接管理、无脏跟踪、无自动初始化提示
- **项目本地存储**：数据存放在工作区目录，而非外部路径
- **错误静默处理**：`ensureFresh` 中同步失败只 log 不中断

```typescript
export const CodegraphPlugin: Plugin = async ({ worktree }) => {
  const cg = new CodeGraphCLI(worktree);

  return {
    tool: {
      codegraph_query: tool(...),
      codegraph_context: tool(...),
      codegraph_callers: tool(...),
      codegraph_callees: tool(...),
      codegraph_impact: tool(...),
      codegraph_status: tool(...),
    },
  };
};
```

## 测试策略

| 层级 | 文件 | 方法 |
|------|------|------|
| CLI 封装 | `codegraph-cli.test.ts` | 全局 mock `child_process.execFile` + 依赖注入 |
| 符号链接 | 同上 | 真实文件系统操作（临时目录） |
| Pi 集成 | 同上 | mock ExtensionAPI，验证工具注册和执行 |

### Mock 策略

`makeExec` 辅助函数实现**最长前缀匹配**的 mock 调度：

```typescript
function makeExec(overrides: Record<string, string>): (args: string[]) => string {
  const sorted = Object.keys(overrides).sort((a, b) => b.length - a.length);
  return (args: string[]) => {
    const cmd = args.join(' ');
    for (const prefix of sorted) {
      if (cmd.startsWith(prefix)) return overrides[prefix];
    }
    throw new Error(`Unexpected command: ${cmd}`);
  };
}
```

## 设计要点

- **三层适配**：CLI 封装 → 类型 API → 平台集成，每层职责单一
- **依赖注入**：`execSyncMock` 使核心类无需 mock 全局即可测试
- **外部存储**：符号链接策略隔离索引数据与项目源码
- **脏跟踪**：增量同步避免每次操作全量重建索引
- **结果类型**：`tryRun` 返回 `{ok, out} | {ok, err}`，优雅降级而非抛异常
- **双平台**：同一核心 API 同时适配 Pi 和 OpenCode，exports map 分别暴露

/**
 * 热键插件系统入口
 *
 * 核心架构:
 * 1. 运行时层 (runtime): 处理键盘事件、上下文匹配、命令执行
 * 2. Vue 集成层 (vue/plugin): 提供组合式 API，管理组件生命周期
 * 3. 扩展层 (extensions): 基于运行时构建的高级功能 (如命令面板)
 *
 * 关键概念:
 * - Context (上下文): UI 组件树形成的路径，用于精确匹配热键作用域
 * - Mode (模式): 当前交互模式 (normal/insert/command)，决定哪些热键生效
 * - Binding (绑定): 按键序列到命令的静态映射
 * - Handler (处理器): 命令的动态执行逻辑，由组件注册/注销
 * - Snapshot (快照): 运行时状态的不可变视图，用于匹配和查询
 */

// ============ Vue 插件与组合式 API ============
export {
  /** 创建并安装 Vue 热键插件，初始化全局运行时实例 */
  createHotkeyPlugin,
  /** 尝试获取运行时实例 (可能为 null) */
  tryUseHotkeyRuntime,
  /** 为命令注册处理器，组件卸载时自动清理 */
  useCmd,
  /** 命令面板状态管理，提供查询/执行/导航功能 */
  useCommandPalette,
  /** 注册上下文节点，定义热键的作用域层级 */
  useCtx,
  /** 获取热键运行时实例 (未安装时抛出异常) */
  useHotkeyRuntime,
} from './vue/plugin';

// ============ Vue 声明式组件 ============
export {
  /** 声明式上下文节点组件 */
  HotkeyContext,
  /** 声明式命令处理器组件 */
  HotkeyCommand,
} from './vue/components';

// ============ 核心运行时 ============
export {
  /** 创建独立的热键运行时实例 (底层 API) */
  createHotkeyRuntime,
} from './core/runtime';

// ============ 扩展功能 ============
export {
  /** 创建命令面板状态机，管理 UI 展示逻辑 */
  createCommandPaletteState,
} from './extensions/commandPalette';

// ============ 类型定义 ============
export { HOTKEY_MODES } from './core/types';

/**
 * 核心类型说明:
 *
 * 静态注册 (应用启动时注册一次):
 * - HotkeyCommandDefinition: 命令元数据 (ID、标题、分类、启用条件)
 * - HotkeyBindingDefinition: 绑定元数据 (按键序列、上下文匹配器、优先级)
 *
 * 动态注册 (组件生命周期内):
 * - HotkeyCommandHandlerDefinition: 命令执行逻辑，组件卸载时需清理
 * - HotkeyContextNode: 当前组件在 UI 树中的位置节点
 *
 * 运行时状态:
 * - HotkeySnapshot: 当前上下文路径 + 模式 + 标志位 + 待处理按键序列
 * - HotkeyRuntime: 运行时核心 API，提供事件处理、命令执行、状态订阅
 *
 * 匹配机制:
 * - HotkeyContextMatcher: 定义绑定在哪些上下文中生效
 *   - kind/id: 精确匹配节点类型/标识
 *   - ancestorKinds: 要求祖先节点包含特定类型
 *   - predicate: 自定义匹配逻辑
 *
 * 执行流程:
 * 1. handleKeydown 捕获键盘事件
 * 2. 构建按键序列候选 (支持多键组合如 "g i" 或单键 "Ctrl+S")
 * 3. 过滤绑定：模式匹配 → when 条件 → 上下文匹配 → 序列匹配
 * 4. 排序：上下文深度 → 显式优先级 → 注册顺序
 * 5. 执行：精确匹配则执行命令，前缀匹配则等待后续按键
 */
export type {
  /** 按键绑定定义：将按键序列映射到命令 */
  HotkeyBindingDefinition,
  /** 命令定义：静态元数据，不包含执行逻辑 */
  HotkeyCommandDefinition,
  /** 命令执行时的上下文参数 */
  HotkeyCommandExecution,
  /** 命令处理器函数类型 */
  HotkeyCommandHandler,
  /** 命令处理器定义：动态注册的执行逻辑 */
  HotkeyCommandHandlerDefinition,
  /** 上下文匹配器：定义绑定在哪些 UI 上下文中生效 */
  HotkeyContextMatcher,
  /** 上下文节点：UI 组件树中的位置标识 */
  HotkeyContextNode,
  /** 上下文注册句柄：用于更新/注销已挂载的节点 */
  HotkeyContextRegistration,
  /** 可执行命令：当前快照下可见且有处理器的命令 */
  HotkeyExecutableCommand,
  /** 交互模式类型 */
  HotkeyMode,
  /** 热键运行时核心接口 */
  HotkeyRuntime,
  /** 运行时状态变更监听器 */
  HotkeyRuntimeListener,
  /** 运行时初始化选项 */
  HotkeyRuntimeOptions,
  /** 运行时状态快照：包含上下文路径、模式、标志位、待处理序列 */
  HotkeySnapshot,
} from './core/types';

/**
 * 命令面板类型说明:
 *
 * 设计思路:
 * - 基于 queryExecutableCommands 构建可见命令列表
 * - 独立管理 UI 状态 (开/关、查询、选中索引)
 * - 自修正索引：当过滤列表变化时自动调整有效范围
 */
export type {
  /** 命令面板状态机接口 */
  HotkeyCommandPaletteState,
  /** 命令面板状态快照 */
  HotkeyCommandPaletteSnapshot,
} from './extensions/commandPalette';

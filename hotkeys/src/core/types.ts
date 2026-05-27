export const HOTKEY_MODES = {
  NORMAL: 'normal',
  INSERT: 'insert',
  COMMAND: 'command',
} as const;

export type HotkeyMode = (typeof HOTKEY_MODES)[keyof typeof HOTKEY_MODES];

/** A single semantic node on the active UI context path. */
export interface HotkeyContextNode {
  readonly id: string;
  /** Whether this node and its descendants are currently participating in hotkey matching. */
  readonly active?: boolean;
  /** The id of the parent context node. If omitted, it may inherit from the provide/inject context. */
  readonly parentId?: string;
}

/** The runtime state used for command visibility, matching, and execution. */
export interface HotkeySnapshot {
  readonly contextPath: readonly HotkeyContextNode[];
  readonly mode: HotkeyMode;
  readonly flags: Readonly<Record<string, boolean>>;
  readonly pendingSequence: string | null;
}

/** Matches the deepest active context node during binding lookup. */
export interface HotkeyContextMatcher {
  readonly id: string;
}

/** Static command metadata registered at app startup. */
export interface HotkeyCommandDefinition {
  readonly id: string;
  readonly title: string;
  readonly category?: string;
  readonly aliases?: readonly string[];
  readonly isEnabled?: (snapshot: HotkeySnapshot) => boolean;
  readonly visibleWhen?: (snapshot: HotkeySnapshot) => boolean;
}

/** Static keybinding metadata registered at app startup. */
export interface HotkeyBindingDefinition {
  readonly commandId: string;
  readonly keys: string;
  readonly context?: HotkeyContextMatcher;
  readonly priority?: number;
  readonly mode?: HotkeyMode | readonly HotkeyMode[];
  readonly preventDefault?: boolean;
  readonly when?: (snapshot: HotkeySnapshot) => boolean;
}

/** A command that is currently visible and has at least one matching handler. */
export interface HotkeyExecutableCommand extends HotkeyCommandDefinition {
  readonly executable: true;
}

/** The execution payload delivered to a resolved command handler. */
export interface HotkeyCommandExecution {
  readonly command: HotkeyCommandDefinition;
  readonly event?: KeyboardEvent;
  readonly runtime: HotkeyRuntime;
  readonly snapshot: HotkeySnapshot;
}

export type HotkeyCommandHandler = (
  execution: HotkeyCommandExecution,
) => void | Promise<void>;

/** A dynamic command handler owned by a mounted component or feature. */
export interface HotkeyCommandHandlerDefinition {
  readonly commandId: string;
  readonly run: HotkeyCommandHandler;
}

/** Options for creating a new runtime instance. */
export interface HotkeyRuntimeOptions {
  readonly initialSnapshot?: HotkeySnapshot;
}

export type HotkeyRuntimeListener = (snapshot: HotkeySnapshot) => void;

/** Handle returned when a context node is mounted into the manager. */
export interface HotkeyContextRegistration {
  readonly id: string;
  /** Replaces the mounted node while preserving its identity. */
  readonly update: (node: HotkeyContextNode) => void;
  /** Unmounts the node from the global context tree. */
  readonly dispose: () => void;
}

export interface HotkeyContextManager {
  /** Returns the current active context ids from root to leaf. */
  getActiveContextIds: () => readonly string[];
  /** Registers a context node and returns a handle for future updates. */
  register: (node: HotkeyContextNode) => HotkeyContextRegistration;
}

export interface HotkeyRuntime {
  /** Publishes the current snapshot to all runtime subscribers. */
  emitChange: () => void;
  /** Executes the registered handler for a command in the current snapshot. */
  executeCommand: (
    commandId: string,
    event?: KeyboardEvent,
  ) => Promise<boolean>;
  /** Matches a keyboard event against bindings and executes the resolved command. */
  handleKeydown: (event: KeyboardEvent) => Promise<boolean>;
  /** Returns the global context manager. */
  getContextManager: () => HotkeyContextManager;
  /** Returns all static bindings in registration order. */
  getBindings: () => readonly HotkeyBindingDefinition[];
  /** Returns all static commands in registration order. */
  getCommands: () => readonly HotkeyCommandDefinition[];
  /** Returns a defensive copy of the current runtime snapshot. */
  getSnapshot: () => HotkeySnapshot;
  /** Lists commands visible and executable for the provided snapshot. */
  queryExecutableCommands: (
    snapshot?: HotkeySnapshot,
  ) => HotkeyExecutableCommand[];
  /** Registers static binding definitions owned by the application. */
  registerBindings: (definitions: readonly HotkeyBindingDefinition[]) => void;
  /** Registers static command definitions owned by the application. */
  registerCommands: (definitions: readonly HotkeyCommandDefinition[]) => void;
  /** Registers dynamic handlers and returns a disposer for the whole batch. */
  registerHandlers: (
    definitions: readonly HotkeyCommandHandlerDefinition[],
  ) => () => void;
  /** Clears any pending multi-stroke sequence state. */
  resetPendingSequence: () => void;
  /** Updates a single flag while preserving the rest of the snapshot. */
  setFlag: (name: string, active: boolean) => void;
  /** Replaces the current interaction mode. */
  setMode: (mode: HotkeyMode) => void;
  /** Replaces the runtime snapshot used for matching and execution. */
  setSnapshot: (snapshot: HotkeySnapshot) => void;
  /** Subscribes to runtime changes. */
  subscribe: (listener: HotkeyRuntimeListener) => () => void;
}

export const HOTKEY_MODES = {
  NORMAL: 'normal',
  INSERT: 'insert',
  COMMAND: 'command',
} as const;

export type HotkeyMode = (typeof HOTKEY_MODES)[keyof typeof HOTKEY_MODES];

export interface HotkeyContextNode {
  readonly id: string;
  readonly active?: boolean;
  readonly parentId?: string;
}

export interface HotkeySnapshot {
  readonly contextPath: readonly HotkeyContextNode[];
  readonly mode: HotkeyMode;
  readonly flags: Readonly<Record<string, boolean>>;
  readonly pendingSequence: string | null;
}

export interface HotkeyContextMatcher {
  readonly id: string;
}

export interface HotkeyCommandDefinition {
  readonly id: string;
  readonly title: string;
  readonly category?: string;
  readonly aliases?: readonly string[];
  readonly isEnabled?: (snapshot: HotkeySnapshot) => boolean;
  readonly visibleWhen?: (snapshot: HotkeySnapshot) => boolean;
}

export interface HotkeyBindingDefinition {
  readonly commandId: string;
  readonly keys: string;
  readonly context?: HotkeyContextMatcher;
  readonly priority?: number;
  readonly mode?: HotkeyMode | readonly HotkeyMode[];
  readonly preventDefault?: boolean;
  readonly when?: (snapshot: HotkeySnapshot) => boolean;
}

export interface HotkeyExecutableCommand extends HotkeyCommandDefinition {
  readonly executable: true;
}

export interface HotkeyCommandExecution {
  readonly command: HotkeyCommandDefinition;
  readonly event?: KeyboardEvent;
  readonly runtime: HotkeyRuntime;
  readonly snapshot: HotkeySnapshot;
}

export type HotkeyCommandHandler = (
  execution: HotkeyCommandExecution,
) => void | Promise<void>;

export interface HotkeyCommandHandlerDefinition {
  readonly commandId: string;
  readonly run: HotkeyCommandHandler;
}

export interface HotkeyRuntimeOptions {
  readonly initialSnapshot?: HotkeySnapshot;
}

export type HotkeyRuntimeListener = (snapshot: HotkeySnapshot) => void;

export interface HotkeyContextRegistration {
  readonly id: string;
  readonly update: (node: HotkeyContextNode) => void;
  readonly dispose: () => void;
}

export interface HotkeyContextManager {
  getActiveContextIds: () => readonly string[];
  register: (node: HotkeyContextNode) => HotkeyContextRegistration;
}

export interface HotkeyRuntime {
  emitChange: () => void;
  executeCommand: (commandId: string, event?: KeyboardEvent) => Promise<boolean>;
  handleKeydown: (event: KeyboardEvent) => Promise<boolean>;
  getContextManager: () => HotkeyContextManager;
  getBindings: () => readonly HotkeyBindingDefinition[];
  getCommands: () => readonly HotkeyCommandDefinition[];
  getSnapshot: () => HotkeySnapshot;
  queryExecutableCommands: (snapshot?: HotkeySnapshot) => HotkeyExecutableCommand[];
  registerBindings: (definitions: readonly HotkeyBindingDefinition[]) => void;
  registerCommands: (definitions: readonly HotkeyCommandDefinition[]) => void;
  registerHandlers: (definitions: readonly HotkeyCommandHandlerDefinition[]) => () => void;
  resetPendingSequence: () => void;
  setFlag: (name: string, active: boolean) => void;
  setMode: (mode: HotkeyMode) => void;
  setSnapshot: (snapshot: HotkeySnapshot) => void;
  subscribe: (listener: HotkeyRuntimeListener) => () => void;
}

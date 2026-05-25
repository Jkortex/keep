import { createHotkeyContextManager } from './contextManager';
import {
  buildCandidateSequence,
  matchesBindingSequence,
  normalizeBinding,
  SEQUENCE_TIMEOUT_MS,
  toKeyboardStroke,
  type RegisteredHotkeyBinding,
} from './keybinding';
import {
  HOTKEY_MODES,
  type HotkeyBindingDefinition,
  type HotkeyCommandDefinition,
  type HotkeyCommandHandlerDefinition,
  type HotkeyContextMatcher,
  type HotkeyExecutableCommand,
  type HotkeyMode,
  type HotkeyRuntime,
  type HotkeyRuntimeListener,
  type HotkeyRuntimeOptions,
  type HotkeySnapshot,
} from './types';

const DEFAULT_SNAPSHOT: HotkeySnapshot = {
  contextPath: [],
  mode: HOTKEY_MODES.NORMAL,
  flags: {},
  pendingSequence: null,
};

function resolveContextMatchDepth(
  matcher: HotkeyContextMatcher | undefined,
  snapshot: HotkeySnapshot,
): number {
  if (!matcher) return 0;
  const { contextPath } = snapshot;

  for (let i = contextPath.length - 1; i >= 0; i--) {
    const currentNode = contextPath[i];
    if (currentNode?.id === matcher.id) {
      return i + 1;
    }
  }
  return -1;
}

function matchesMode(
  bindingMode: HotkeyMode | readonly HotkeyMode[] | undefined,
  currentMode: HotkeyMode,
): boolean {
  if (!bindingMode) return currentMode === HOTKEY_MODES.NORMAL;
  if (Array.isArray(bindingMode)) return bindingMode.includes(currentMode);
  return bindingMode === currentMode;
}

function cloneSnapshot(snapshot: HotkeySnapshot): HotkeySnapshot {
  return {
    ...snapshot,
    contextPath: [...snapshot.contextPath],
    flags: { ...snapshot.flags },
  };
}

export function createHotkeyRuntime(
  options: HotkeyRuntimeOptions = {},
): HotkeyRuntime {
  const commands = new Map<string, HotkeyCommandDefinition>();
  const bindings: RegisteredHotkeyBinding[] = [];
  const handlers = new Map<string, HotkeyCommandHandlerDefinition>();
  const listeners = new Set<HotkeyRuntimeListener>();

  let snapshot = cloneSnapshot(options.initialSnapshot ?? DEFAULT_SNAPSHOT);
  let nextBindingOrder = 0;
  let pendingExpiresAt = 0;

  const getSnapshot = (): HotkeySnapshot => cloneSnapshot(snapshot);

  const emitChange = (): void => {
    const currentSnapshot = getSnapshot();
    listeners.forEach((listener) => listener(currentSnapshot));
  };

  const setSnapshot = (nextSnapshot: HotkeySnapshot): void => {
    snapshot = cloneSnapshot(nextSnapshot);
  };

  const patchSnapshot = (patch: Partial<HotkeySnapshot>): void => {
    snapshot = { ...snapshot, ...patch };
    emitChange();
  };

  const registerCommands = (
    definitions: readonly HotkeyCommandDefinition[],
  ): void => {
    definitions.forEach((def) => commands.set(def.id, def));
    emitChange();
  };

  const registerBindings = (
    definitions: readonly HotkeyBindingDefinition[],
  ): void => {
    const registered = definitions.map((def) =>
      normalizeBinding(def, nextBindingOrder++),
    );
    bindings.push(...registered);
    emitChange();
  };

  const registerHandlers = (
    definitions: readonly HotkeyCommandHandlerDefinition[],
  ): (() => void) => {
    definitions.forEach((def) => {
      if (handlers.has(def.commandId)) {
        throw new Error(
          `Duplicate hotkey handler registration for "${def.commandId}".`,
        );
      }
      handlers.set(def.commandId, def);
    });
    emitChange();
    return () => {
      definitions.forEach((def) => handlers.delete(def.commandId));
      emitChange();
    };
  };

  const resolveBindingMatches = (
    candidate: string,
    currentSnapshot: HotkeySnapshot,
  ): RegisteredHotkeyBinding[] => {
    const matches: { binding: RegisteredHotkeyBinding; depth: number }[] = [];

    for (const b of bindings) {
      if (!matchesMode(b.mode, currentSnapshot.mode)) continue;
      if (b.when && !b.when(currentSnapshot)) continue;

      const depth = resolveContextMatchDepth(b.context, currentSnapshot);
      if (depth < 0) continue;
      if (!matchesBindingSequence(candidate, b.normalizedKeys)) continue;

      matches.push({ binding: b, depth });
    }

    return matches
      .sort((a, b) => {
        if (b.depth !== a.depth) return b.depth - a.depth;
        if (b.binding.priority !== a.binding.priority)
          return b.binding.priority - a.binding.priority;
        return a.binding.order - b.binding.order;
      })
      .map((m) => m.binding);
  };

  const hasExecutableBinding = (
    commandId: string,
    currentSnapshot: HotkeySnapshot,
  ): boolean => {
    return bindings.some((b) => {
      return (
        b.commandId === commandId &&
        (b.when?.(currentSnapshot) ?? true) &&
        resolveContextMatchDepth(b.context, currentSnapshot) >= 0
      );
    });
  };

  const queryExecutableCommands = (
    targetSnapshot?: HotkeySnapshot,
  ): HotkeyExecutableCommand[] => {
    const s = targetSnapshot ?? getSnapshot();
    return [...commands.values()]
      .filter((c) => c.visibleWhen?.(s) ?? c.isEnabled?.(s) ?? true)
      .filter((c) => handlers.has(c.id))
      .filter((c) => hasExecutableBinding(c.id, s))
      .map((c) => ({ ...c, executable: true }));
  };

  const executeCommand = async (
    commandId: string,
    event?: KeyboardEvent,
  ): Promise<boolean> => {
    const command = commands.get(commandId);
    const handler = handlers.get(commandId);
    if (!command || !handler) return false;

    const currentSnapshot = getSnapshot();
    if (command.visibleWhen && !command.visibleWhen(currentSnapshot)) {
      return false;
    }
    if (command.isEnabled && !command.isEnabled(currentSnapshot)) return false;

    await handler.run({ command, event, runtime, snapshot: currentSnapshot });
    return true;
  };

  const resetPendingSequence = (): void => {
    if (snapshot.pendingSequence) {
      pendingExpiresAt = 0;
      patchSnapshot({ pendingSequence: null });
    }
  };

  const handleKeydown = async (event: KeyboardEvent): Promise<boolean> => {
    const stroke = toKeyboardStroke(event);
    if (!stroke) return false;

    const currentSnapshot = getSnapshot();
    const candidate = buildCandidateSequence(
      stroke,
      currentSnapshot.pendingSequence,
      pendingExpiresAt,
    );
    const matches = resolveBindingMatches(candidate, currentSnapshot);

    if (matches.length === 0) {
      resetPendingSequence();
      return false;
    }

    const exactMatch = matches.find((b) => b.normalizedKeys === candidate);
    const hasPrefix = matches.some((b) =>
      b.normalizedKeys.startsWith(`${candidate} `),
    );

    if (hasPrefix && !exactMatch) {
      if (matches.some((b) => b.preventDefault)) event.preventDefault();
      pendingExpiresAt = Date.now() + SEQUENCE_TIMEOUT_MS;
      patchSnapshot({ pendingSequence: candidate });
      return true;
    }

    resetPendingSequence();
    if (!exactMatch) return false;
    if (exactMatch.preventDefault) event.preventDefault();

    return executeCommand(exactMatch.commandId, event);
  };

  const contextManager = createHotkeyContextManager({
    emitChange,
    getSnapshot,
    setSnapshot,
  });

  const runtime: HotkeyRuntime = {
    emitChange,
    executeCommand,
    handleKeydown,
    getContextManager: () => contextManager,
    getBindings: () => [...bindings],
    getCommands: () => [...commands.values()],
    getSnapshot,
    queryExecutableCommands,
    registerBindings,
    registerCommands,
    registerHandlers,
    resetPendingSequence,
    setFlag: (name, active) => {
      patchSnapshot({ flags: { ...snapshot.flags, [name]: active } });
    },
    setMode: (mode) => {
      patchSnapshot({ mode });
    },
    setSnapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };

  return runtime;
}

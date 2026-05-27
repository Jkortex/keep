import {
  HOTKEY_MODES,
  type HotkeyExecutableCommand,
  type HotkeySnapshot,
  type HotkeyRuntime,
} from '../core/types';

export interface HotkeyCommandPaletteSnapshot {
  readonly activeIndex: number;
  readonly isOpen: boolean;
  readonly items: readonly HotkeyExecutableCommand[];
  readonly query: string;
}

/** UI-facing state machine built on top of the core executable-command query. */
export interface HotkeyCommandPaletteState {
  /** Returns a defensive snapshot of the current palette state. */
  getState: () => HotkeyCommandPaletteSnapshot;
  /** Closes the palette and clears query and selection state. */
  close: () => void;
  /** Executes the currently highlighted command. */
  executeActive: () => Promise<boolean>;
  /** Executes a specific command by id against the current runtime snapshot. */
  executeById: (commandId: string) => Promise<boolean>;
  /** Moves the highlighted command within the filtered item list. */
  moveSelection: (delta: number) => void;
  /** Opens the palette and switches the runtime into command mode. */
  open: () => void;
  /** Releases runtime subscriptions for the palette state. */
  dispose: () => void;
  /** Updates the palette search query. */
  setQuery: (query: string) => void;
  /** Subscribes to palette state changes. */
  subscribe: (
    listener: (snapshot: HotkeyCommandPaletteSnapshot) => void,
  ) => () => void;
}

const filterItems = (
  items: readonly HotkeyExecutableCommand[],
  query: string,
): readonly HotkeyExecutableCommand[] => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return items;

  return items.filter((command) => {
    return (
      command.title.toLowerCase().includes(normalizedQuery) ||
      command.id.toLowerCase().includes(normalizedQuery) ||
      command.category?.toLowerCase().includes(normalizedQuery) ||
      command.aliases?.some((alias) =>
        alias.toLowerCase().includes(normalizedQuery),
      )
    );
  });
};

const clampIndex = (index: number, length: number): number => {
  if (length === 0) return 0;
  if (index < 0) return 0;
  if (index >= length) return length - 1;
  return index;
};

/**
 * Extension that provides a managed state machine for a Command Palette UI.
 * It tracks the palette's open state, search query, and highlighted item.
 *
 * @example
 * ```ts
 * const palette = createCommandPaletteState(runtime);
 *
 * palette.subscribe(state => {
 *   renderPalette(state.items, state.activeIndex, state.isOpen);
 * });
 *
 * // Trigger from UI
 * palette.open();
 * palette.setQuery('git');
 * palette.moveSelection(1);
 * palette.executeActive();
 * ```
 */
export function createCommandPaletteState(
  runtime: HotkeyRuntime,
): HotkeyCommandPaletteState {
  const listeners = new Set<(snapshot: HotkeyCommandPaletteSnapshot) => void>();
  let isOpen = false;
  let query = '';
  let activeIndex = 0;
  let baseSnapshot: HotkeySnapshot | null = null;

  const getState = (): HotkeyCommandPaletteSnapshot => {
    const rawItems = runtime.queryExecutableCommands(baseSnapshot ?? undefined);
    const items = filterItems(rawItems, query);

    // Self-correcting state: ensure index is valid for current filtered list
    activeIndex = clampIndex(activeIndex, items.length);

    return { isOpen, query, activeIndex, items };
  };

  const emit = (): void => {
    const snapshot = getState();
    listeners.forEach((listener) => listener(snapshot));
  };

  const runtimeUnsubscribe = runtime.subscribe(emit);

  const open = (): void => {
    isOpen = true;
    query = '';
    activeIndex = 0;
    baseSnapshot = runtime.getSnapshot();
    runtime.setMode(HOTKEY_MODES.COMMAND);
    emit();
  };

  const close = (): void => {
    isOpen = false;
    query = '';
    activeIndex = 0;
    baseSnapshot = null;
    runtime.setMode(HOTKEY_MODES.NORMAL);
    emit();
  };

  const setQuery = (q: string): void => {
    query = q;
    activeIndex = 0;
    emit();
  };

  const moveSelection = (delta: number): void => {
    activeIndex += delta;
    emit();
  };

  const executeById = async (commandId: string): Promise<boolean> => {
    const executed = await runtime.executeCommand(commandId);
    if (executed && isOpen) close();
    return executed;
  };

  const executeActive = (): Promise<boolean> => {
    const { items, activeIndex: idx } = getState();
    return items[idx] ? executeById(items[idx].id) : Promise.resolve(false);
  };

  const subscribe = (
    listener: (snapshot: HotkeyCommandPaletteSnapshot) => void,
  ): (() => void) => {
    listeners.add(listener);
    return (): void => {
      listeners.delete(listener);
    };
  };

  const dispose = (): void => {
    runtimeUnsubscribe();
    listeners.clear();
  };

  return {
    close,
    dispose,
    executeActive,
    executeById,
    getState,
    moveSelection,
    open,
    setQuery,
    subscribe,
  };
}

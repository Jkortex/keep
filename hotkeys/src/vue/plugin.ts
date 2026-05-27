import type { App, InjectionKey, MaybeRefOrGetter, Ref } from 'vue';
import {
  computed,
  inject,
  onUnmounted,
  provide,
  ref,
  shallowRef,
  toValue,
  watch,
} from 'vue';
import { createHotkeyRuntime } from '../core/runtime';
import { resolveProvidedContextId } from './contextInheritance';
import type {
  HotkeyBindingDefinition,
  HotkeyCommandDefinition,
  HotkeyCommandHandler,
  HotkeyContextNode,
  HotkeyRuntime,
} from '../core/types';
import { createCommandPaletteState } from '../extensions/commandPalette';

const HOTKEY_RUNTIME_KEY: InjectionKey<HotkeyRuntime> =
  Symbol('hotkey-runtime');
const HOTKEY_PARENT_CONTEXT_KEY: InjectionKey<Ref<string | null>> = Symbol(
  'hotkey-parent-context',
);

export interface CreateHotkeyPluginOptions {
  readonly bindings?: readonly HotkeyBindingDefinition[];
  readonly commands?: readonly HotkeyCommandDefinition[];
}

/** Creates and installs the shared hotkey runtime for the current Vue app. */
export function createHotkeyPlugin(options: CreateHotkeyPluginOptions = {}): {
  install: (app: App) => void;
  runtime: HotkeyRuntime;
} {
  const runtime = createHotkeyRuntime();
  runtime.registerCommands(options.commands ?? []);
  runtime.registerBindings(options.bindings ?? []);

  return {
    install(app): void {
      app.provide(HOTKEY_RUNTIME_KEY, runtime);
    },
    runtime,
  };
}

/** Returns the injected hotkey runtime instance. */
export function useHotkeyRuntime(): HotkeyRuntime {
  const runtime = tryUseHotkeyRuntime();
  if (!runtime) {
    throw new Error('Hotkey runtime is not installed.');
  }
  return runtime;
}

/** Returns the injected hotkey runtime when available, otherwise `null`. */
export function tryUseHotkeyRuntime(): HotkeyRuntime | null {
  return inject(HOTKEY_RUNTIME_KEY, null);
}

/** Registers a component-owned context node and exposes its id to descendants. */
export function useCtx(
  definition: MaybeRefOrGetter<HotkeyContextNode>,
): Ref<string | null> {
  const runtime = useHotkeyRuntime();
  const inheritedParentId = inject(
    HOTKEY_PARENT_CONTEXT_KEY,
    ref<string | null>(null),
  );
  const contextId = ref<string | null>(null);

  // Resolved node directly reflects the flat HotkeyContextNode structure
  const resolvedNode = computed(() => {
    const node = toValue(definition);
    return {
      ...node,
      parentId: node.parentId ?? inheritedParentId.value ?? undefined,
    };
  });

  const providedContextId = computed(() => {
    const node = resolvedNode.value;
    return resolveProvidedContextId(
      node.active !== false,
      contextId.value,
      inheritedParentId.value,
    );
  });

  provide(HOTKEY_PARENT_CONTEXT_KEY, providedContextId);

  const registration = runtime.getContextManager().register(resolvedNode.value);
  contextId.value = registration.id;

  watch(
    resolvedNode,
    (nextNode) => {
      registration.update(nextNode);
    },
    { deep: true },
  );

  onUnmounted(() => {
    registration.dispose();
    contextId.value = null;
  });

  return contextId;
}

/** Registers the unique runtime handler for a command. */
export function useCmd(commandId: string, handler: HotkeyCommandHandler): void {
  const runtime = useHotkeyRuntime();

  const dispose = runtime.registerHandlers([
    {
      commandId,
      run: handler,
    },
  ]);

  onUnmounted(() => {
    dispose();
  });
}

/** Exposes runtime-backed command palette state for Vue components. */
export function useCommandPalette() {
  const runtime = useHotkeyRuntime();
  const palette = createCommandPaletteState(runtime);
  const query = ref(palette.getState().query);
  const paletteState = shallowRef(palette.getState());
  const snapshot = shallowRef(runtime.getSnapshot());

  const unsubscribePalette = palette.subscribe((nextState) => {
    paletteState.value = nextState;
    if (query.value !== nextState.query) {
      query.value = nextState.query;
    }
  });

  const unsubscribeRuntime = runtime.subscribe((nextSnapshot) => {
    snapshot.value = nextSnapshot;
  });

  watch(query, (nextQuery) => {
    if (nextQuery === paletteState.value.query) return;
    palette.setQuery(nextQuery);
  });

  onUnmounted(() => {
    unsubscribePalette();
    unsubscribeRuntime();
    palette.dispose();
  });

  return {
    close: palette.close,
    executeActive: palette.executeActive,
    executeCommand: palette.executeById,
    isOpen: computed(() => paletteState.value.isOpen),
    items: computed(() => paletteState.value.items),
    moveSelection: palette.moveSelection,
    query,
    activeIndex: computed(() => paletteState.value.activeIndex),
    open: palette.open,
    snapshot,
  };
}

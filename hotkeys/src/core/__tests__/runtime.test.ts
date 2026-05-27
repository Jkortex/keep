import { describe, expect, it, vi } from 'vitest';
import { createHotkeyRuntime } from '../runtime';

const createKeydownEvent = (key: string): KeyboardEvent => {
  return {
    altKey: false,
    ctrlKey: false,
    key,
    metaKey: false,
    preventDefault: vi.fn(),
    shiftKey: false,
  } as unknown as KeyboardEvent;
};

describe('createHotkeyRuntime context matching', () => {
  const setupContextHierarchy = (
    runtime: ReturnType<typeof createHotkeyRuntime>,
  ) => {
    runtime.getContextManager().register({ id: 'app' });
    runtime
      .getContextManager()
      .register({ id: 'editor', parentId: 'app' });
    runtime
      .getContextManager()
      .register({ id: 'code-block-1', parentId: 'editor' });
  };

  it('prefers deeper context matches over shallower ones', async () => {
    const runtime = createHotkeyRuntime();
    const pageRun = vi.fn();
    const rootRun = vi.fn();

    setupContextHierarchy(runtime);

    runtime.registerCommands([
      { id: 'cmd.root', title: 'Root command' },
      { id: 'cmd.page', title: 'Page command' },
    ]);

    runtime.registerHandlers([
      { commandId: 'cmd.root', run: rootRun },
      { commandId: 'cmd.page', run: pageRun },
    ]);

    runtime.registerBindings([
      { commandId: 'cmd.root', context: { id: 'app' }, keys: 'x' },
      { commandId: 'cmd.page', context: { id: 'editor' }, keys: 'x' },
    ]);

    await runtime.handleKeydown(createKeydownEvent('x'));

    expect(pageRun).toHaveBeenCalledTimes(1);
    expect(rootRun).not.toHaveBeenCalled();
  });

  it('global binding (no context) works without context requirements', async () => {
    const runtime = createHotkeyRuntime();
    const globalRun = vi.fn();

    setupContextHierarchy(runtime);

    runtime.registerCommands([{ id: 'cmd.global', title: 'Global command' }]);
    runtime.registerHandlers([{ commandId: 'cmd.global', run: globalRun }]);

    runtime.registerBindings([{ commandId: 'cmd.global', keys: 'g' }]);

    await runtime.handleKeydown(createKeydownEvent('g'));
    expect(globalRun).toHaveBeenCalledTimes(1);
  });
});

describe('createHotkeyRuntime', () => {
  it('executes a single-stroke binding in the active mode', async () => {
    const runtime = createHotkeyRuntime();
    const run = vi.fn();

    runtime.registerCommands([{ id: 'memo.next', title: 'Next memo' }]);
    runtime.registerHandlers([{ commandId: 'memo.next', run }]);
    runtime.registerBindings([{ commandId: 'memo.next', keys: 'j' }]);

    const handled = await runtime.handleKeydown(createKeydownEvent('j'));

    expect(handled).toBe(true);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('keeps pending sequence state until the second stroke resolves', async () => {
    const runtime = createHotkeyRuntime();
    const run = vi.fn();

    runtime.registerCommands([{ id: 'nav.home', title: 'Go home' }]);
    runtime.registerHandlers([{ commandId: 'nav.home', run }]);
    runtime.registerBindings([{ commandId: 'nav.home', keys: 'g h' }]);

    const firstHandled = await runtime.handleKeydown(createKeydownEvent('g'));

    expect(firstHandled).toBe(true);
    expect(runtime.getSnapshot().pendingSequence).toBe('g');

    const secondHandled = await runtime.handleKeydown(createKeydownEvent('h'));

    expect(secondHandled).toBe(true);
    expect(run).toHaveBeenCalledTimes(1);
    expect(runtime.getSnapshot().pendingSequence).toBeNull();
  });

  it('matches bindings along the active path and prefers deeper contexts', async () => {
    const runtime = createHotkeyRuntime();
    const rootRun = vi.fn();
    const pageRun = vi.fn();

    runtime.registerCommands([
      { id: 'nav.random.root', title: 'Random walk root' },
      { id: 'nav.random.page', title: 'Random walk page' },
    ]);

    runtime.getContextManager().register({ id: 'root' });
    runtime.getContextManager().register({ id: 'home', parentId: 'root' });
    runtime.getContextManager().register({
      id: 'memo-editor',
      parentId: 'home',
    });

    runtime.registerHandlers([
      { commandId: 'nav.random.root', run: rootRun },
      { commandId: 'nav.random.page', run: pageRun },
    ]);

    runtime.registerBindings([
      {
        commandId: 'nav.random.root',
        context: { id: 'root' },
        keys: 'g r',
      },
      {
        commandId: 'nav.random.page',
        context: { id: 'home' },
        keys: 'g r',
      },
    ]);

    await runtime.handleKeydown(createKeydownEvent('g'));
    await runtime.handleKeydown(createKeydownEvent('r'));

    expect(pageRun).toHaveBeenCalledTimes(1);
    expect(rootRun).not.toHaveBeenCalled();
  });

  it('rejects duplicate handler registration for the same command', () => {
    const runtime = createHotkeyRuntime();

    runtime.registerCommands([{ id: 'palette.open', title: 'Open palette' }]);
    runtime.registerHandlers([{ commandId: 'palette.open', run: vi.fn() }]);

    expect(() => {
      runtime.registerHandlers([{ commandId: 'palette.open', run: vi.fn() }]);
    }).toThrow('Duplicate hotkey handler registration for "palette.open".');
  });
});
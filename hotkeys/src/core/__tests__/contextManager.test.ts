import { describe, expect, it, vi } from 'vitest';
import { createHotkeyContextManager } from '../contextManager';
import { HOTKEY_MODES, type HotkeySnapshot } from '../types';

const createRuntimeStub = () => {
  let snapshot: HotkeySnapshot = {
    contextPath: [],
    flags: {},
    mode: HOTKEY_MODES.NORMAL,
    pendingSequence: null,
  };

  return {
    emitChange: vi.fn(),
    getSnapshot: () => snapshot,
    setSnapshot: (nextSnapshot: HotkeySnapshot): void => {
      snapshot = nextSnapshot;
    },
  };
};

describe('createHotkeyContextManager', () => {
  it('tracks the deepest active context path and its ids', () => {
    const runtime = createRuntimeStub();
    const manager = createHotkeyContextManager(runtime);

    manager.register({ id: 'home' });
    manager.register({ id: 'memo-editor', parentId: 'home' });

    expect(runtime.getSnapshot().contextPath).toEqual([
      expect.objectContaining({ id: 'home' }),
      expect.objectContaining({ id: 'memo-editor' }),
    ]);
    expect(manager.getActiveContextIds()).toEqual(['home', 'memo-editor']);
  });

  it('falls back when a deeper node becomes inactive', () => {
    const runtime = createRuntimeStub();
    const manager = createHotkeyContextManager(runtime);

    manager.register({ id: 'home' });
    manager.register({ id: 'memo-editor', parentId: 'home' });
    const modal = manager.register({
      active: false,
      id: 'palette',
      parentId: 'memo-editor',
    });

    expect(runtime.getSnapshot().contextPath).toEqual([
      expect.objectContaining({ id: 'home' }),
      expect.objectContaining({ id: 'memo-editor' }),
    ]);

    modal.update({
      active: true,
      id: 'palette',
      parentId: 'memo-editor',
    });

    expect(runtime.getSnapshot().contextPath).toEqual([
      expect.objectContaining({ id: 'home' }),
      expect.objectContaining({ id: 'memo-editor' }),
      expect.objectContaining({ id: 'palette' }),
    ]);

    modal.update({
      active: false,
      id: 'palette',
      parentId: 'memo-editor',
    });

    expect(runtime.getSnapshot().contextPath).toEqual([
      expect.objectContaining({ id: 'home' }),
      expect.objectContaining({ id: 'memo-editor' }),
    ]);
  });

  it('invalidates descendants when an ancestor is inactive', () => {
    const runtime = createRuntimeStub();
    const manager = createHotkeyContextManager(runtime);

    manager.register({
      active: false,
      id: 'home',
    });

    manager.register({
      id: 'memo-editor',
      parentId: 'home',
    });

    expect(runtime.getSnapshot().contextPath).toEqual([]);
    expect(manager.getActiveContextIds()).toEqual([]);
  });

  it('supports idempotent registration with reference counting', () => {
    const runtime = createRuntimeStub();
    const manager = createHotkeyContextManager(runtime);

    const reg1 = manager.register({ id: 'shared-dialog' });
    const reg2 = manager.register({ id: 'shared-dialog' });

    expect(manager.getActiveContextIds()).toEqual(['shared-dialog']);

    reg1.dispose();
    expect(manager.getActiveContextIds()).toEqual(['shared-dialog']);

    reg2.dispose();
    expect(manager.getActiveContextIds()).toEqual([]);
  });

  it('implements stack-based selection for sibling contexts at the same depth', () => {
    const runtime = createRuntimeStub();
    const manager = createHotkeyContextManager(runtime);

    manager.register({ id: 'sidebar' });
    expect(manager.getActiveContextIds()).toEqual(['sidebar']);

    const dialog = manager.register({ id: 'dialog' });
    expect(manager.getActiveContextIds()).toEqual(['dialog']);

    dialog.update({ id: 'dialog', active: false });
    expect(manager.getActiveContextIds()).toEqual(['sidebar']);

    dialog.update({ id: 'dialog', active: true });
    expect(manager.getActiveContextIds()).toEqual(['dialog']);

    dialog.dispose();
    expect(manager.getActiveContextIds()).toEqual(['sidebar']);
  });

  it('preserves child override even if child is older than a newly activated sibling of parent', () => {
    const runtime = createRuntimeStub();
    const manager = createHotkeyContextManager(runtime);

    manager.register({ id: 'sidebar' });
    manager.register({ id: 'editor', parentId: 'sidebar' });

    expect(manager.getActiveContextIds()).toEqual(['sidebar', 'editor']);

    manager.register({ id: 'dialog' });

    expect(manager.getActiveContextIds()).toEqual(['sidebar', 'editor']);
  });
});

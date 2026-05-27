import { describe, expect, it, vi } from 'vitest';
import { createCommandPaletteState } from '../commandPalette';
import { createHotkeyRuntime } from '../../core/runtime';
import { HOTKEY_MODES } from '../../core/types';

describe('createCommandPaletteState', () => {
  it('shows only currently executable commands and reacts to handler changes', () => {
    const runtime = createHotkeyRuntime();
    runtime.registerCommands([
      { id: 'memo.edit', title: 'Edit memo', aliases: ['edit'] },
      { id: 'memo.delete', title: 'Delete memo', aliases: ['delete'] },
    ]);
    runtime.registerBindings([
      { commandId: 'memo.edit', keys: 'e' },
      { commandId: 'memo.delete', keys: 'd' },
    ]);

    const palette = createCommandPaletteState(runtime);
    expect(palette.getState().items).toHaveLength(0);

    const dispose = runtime.registerHandlers([
      { commandId: 'memo.edit', run: vi.fn() },
    ]);

    expect(palette.getState().items.map((item) => item.id)).toEqual([
      'memo.edit',
    ]);

    dispose();
    expect(palette.getState().items).toHaveLength(0);
    palette.dispose();
  });

  it('opens in command mode, filters items, and resets state on close', () => {
    const runtime = createHotkeyRuntime();
    runtime.registerCommands([
      { id: 'memo.edit', title: 'Edit memo', aliases: ['rename'] },
      { id: 'memo.delete', title: 'Delete memo', aliases: ['remove'] },
    ]);
    runtime.registerBindings([
      { commandId: 'memo.edit', keys: 'e' },
      { commandId: 'memo.delete', keys: 'd' },
    ]);
    runtime.registerHandlers([
      { commandId: 'memo.edit', run: vi.fn() },
      { commandId: 'memo.delete', run: vi.fn() },
    ]);

    const palette = createCommandPaletteState(runtime);
    palette.open();
    palette.setQuery('remove');

    expect(runtime.getSnapshot().mode).toBe(HOTKEY_MODES.COMMAND);
    expect(palette.getState().items.map((item) => item.id)).toEqual([
      'memo.delete',
    ]);

    palette.close();

    expect(runtime.getSnapshot().mode).toBe(HOTKEY_MODES.NORMAL);
    expect(palette.getState()).toMatchObject({
      activeIndex: 0,
      isOpen: false,
      query: '',
    });
    palette.dispose();
  });

  it('executes the active command and closes the palette afterwards', async () => {
    const runtime = createHotkeyRuntime();
    const run = vi.fn();

    runtime.registerCommands([{ id: 'memo.edit', title: 'Edit memo' }]);
    runtime.registerBindings([{ commandId: 'memo.edit', keys: 'e' }]);
    runtime.registerHandlers([{ commandId: 'memo.edit', run }]);

    const palette = createCommandPaletteState(runtime);
    palette.open();

    const executed = await palette.executeActive();

    expect(executed).toBe(true);
    expect(run).toHaveBeenCalledTimes(1);
    expect(palette.getState().isOpen).toBe(false);
    expect(runtime.getSnapshot().mode).toBe(HOTKEY_MODES.NORMAL);
    palette.dispose();
  });

  it('keeps the command list from the snapshot captured when the palette opened', () => {
    const runtime = createHotkeyRuntime();

    runtime.registerCommands([
      { id: 'app.command_palette.open', title: 'Open palette' },
      { id: 'app.nav.random_walk', title: 'Random walk' },
    ]);
    runtime.registerBindings([
      {
        commandId: 'app.command_palette.open',
        keys: ':',
        when: (snapshot) => !snapshot.flags['dialog.open'],
      },
      {
        commandId: 'app.nav.random_walk',
        keys: 'g r',
        when: (snapshot) => !snapshot.flags['dialog.open'],
      },
    ]);
    runtime.registerHandlers([
      { commandId: 'app.command_palette.open', run: vi.fn() },
      { commandId: 'app.nav.random_walk', run: vi.fn() },
    ]);

    const palette = createCommandPaletteState(runtime);
    palette.open();

    runtime.setFlag('dialog.open', true);

    expect(palette.getState().items.map((item) => item.id)).toEqual([
      'app.command_palette.open',
      'app.nav.random_walk',
    ]);

    palette.close();
    expect(palette.getState().items).toHaveLength(0);
    palette.dispose();
  });
});

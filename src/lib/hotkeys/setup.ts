import { createHotkeyRuntime } from './runtime';
import { KEEP_COMMANDS, KEEP_BINDINGS } from './commands';
import type { HotkeyRuntime } from './types';

let runtime: HotkeyRuntime | null = null;

export function getRuntime(): HotkeyRuntime | null {
  return runtime;
}

export function initHotkeys(): HotkeyRuntime {
  if (runtime) return runtime;

  runtime = createHotkeyRuntime();
  runtime.registerCommands(KEEP_COMMANDS);
  runtime.registerBindings(KEEP_BINDINGS);

  const ctx = runtime.getContextManager();
  ctx.register({ id: 'app/root', active: true });

  document.addEventListener('keydown', (event) => {
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      (event.target as HTMLElement)?.isContentEditable
    ) {
      if (event.key === 'Escape') {
        (event.target as HTMLElement).blur();
      }
      return;
    }
    runtime!.handleKeydown(event);
  });

  return runtime;
}

export function registerPageContext(pageId: string, parentId = 'app/root') {
  if (!runtime) return;
  const ctx = runtime.getContextManager();
  const reg = ctx.register({ id: pageId, parentId, active: true });
  return reg;
}

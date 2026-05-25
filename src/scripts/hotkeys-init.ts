import { createHotkeyRuntime } from '../lib/hotkeys/runtime';
import { KEEP_COMMANDS, KEEP_BINDINGS } from '../lib/hotkeys/commands';
import type { HotkeyRuntime } from '../lib/hotkeys/types';
import { setupCommandPalette } from './command-palette';
import * as theme from '../lib/theme';

const runtime: HotkeyRuntime = createHotkeyRuntime();
runtime.registerCommands(KEEP_COMMANDS);
runtime.registerBindings(KEEP_BINDINGS);

const ctx = runtime.getContextManager();
ctx.register({ id: 'app/root', active: true });

setupCommandPalette(runtime);

runtime.registerHandlers([
  {
    commandId: 'app.nav.home',
    run: () => { window.location.href = '/'; },
  },
  {
    commandId: 'app.theme.toggle',
    run: () => {
      theme.toggleTheme();
    },
  },
  {
    commandId: 'app.palette.open',
    run: () => {
      if ((window as any).__openPalette) (window as any).__openPalette('');
    },
  },
  {
    commandId: 'app.search.open',
    run: () => { window.location.href = '/search'; },
  },
  {
    commandId: 'app.help.toggle',
    run: () => toggleHelpPanel(runtime),
  },
]);

function toggleHelpPanel(rt: HotkeyRuntime) {
  const overlay = document.getElementById('hotkey-help-overlay');
  if (!overlay) return;
  const isOpen = overlay.style.display !== 'none';
  overlay.style.display = isOpen ? 'none' : 'flex';
  document.body.style.overflow = isOpen ? '' : 'hidden';
  rt.setFlag('help.open', !isOpen);
}

function closeHelpPanel() {
  const overlay = document.getElementById('hotkey-help-overlay');
  if (!overlay) return;
  overlay.style.display = 'none';
  document.body.style.overflow = '';
  runtime.setFlag('help.open', false);
}

// Close help with Escape (global)
document.addEventListener('keydown', (event) => {
  const overlay = document.getElementById('hotkey-help-overlay');
  if (event.key === 'Escape' && overlay?.style.display !== 'none') {
    closeHelpPanel();
    return;
  }

  // Skip if focus is in input/textarea
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

  runtime.handleKeydown(event);
});

// Close help on backdrop click / close button
document.addEventListener('click', (e) => {
  const overlay = document.getElementById('hotkey-help-overlay');
  if (!overlay || overlay.style.display === 'none') return;

  const target = e.target as HTMLElement;
  if (target === overlay || target.closest('#hotkey-help-close')) {
    closeHelpPanel();
  }
});

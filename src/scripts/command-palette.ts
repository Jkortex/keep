import type { HotkeyRuntime } from '../../hotkeys/src/core/types';
import type { PaletteItem, PaletteSymbolItem, FilterMode } from '../lib/palette';

let COMMANDS: PaletteItem[] = [];
let PAGES: PaletteItem[] = [];

// ── Recent articles tracking ──
const RECENT_KEY = 'palette_recent';
const MAX_RECENT = 5;

function getRecents(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

function addRecent(url: string) {
  const recents = getRecents().filter((u) => u !== url);
  recents.unshift(url);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recents.slice(0, MAX_RECENT)));
}

function getRecentPages(): (PaletteItem & { url: string })[] {
  const urls = getRecents();
  const pages = PAGES.filter((p): p is PaletteItem & { url: string; type: 'page' } => p.type === 'page');
  const pageMap = new Map(pages.map((p) => [p.url, p]));
  return urls.map((url) => pageMap.get(url)).filter(Boolean) as (PaletteItem & { url: string })[];
}

// Track page visits from palette navigation
const origPushState = history.pushState;
history.pushState = function (...args) {
  origPushState.apply(this, args);
  // Track new URL
  const url = args[2];
  if (typeof url === 'string' && url.startsWith('/knowledge/')) {
    addRecent(url);
  }
};
window.addEventListener('popstate', () => {
  const url = window.location.pathname;
  if (url.startsWith('/knowledge/')) {
    addRecent(url);
  }
});

let SYMBOLS: PaletteSymbolItem[] = [];

function generateCodeBlockId(index: number): string {
  return `palette-code-${index}`;
}

function scanPageSymbols(): PaletteSymbolItem[] {
  const symbols: PaletteSymbolItem[] = [];

  document.querySelectorAll('h2[id], h3[id]').forEach((h) => {
    const text = h.textContent?.trim();
    if (!text) return;
    symbols.push({
      type: 'symbol',
      id: h.id,
      title: text,
      kind: h.tagName === 'H2' ? 'heading-2' : 'heading-3',
    });
  });

  let codeIndex = 0;
  document.querySelectorAll('pre').forEach((pre) => {
    const code = pre.querySelector('code');
    if (!code) return;
    const classMatch = code.className.match(/language-(\w+)/);
    const language = classMatch?.[1] || 'text';
    if (!pre.id) pre.id = generateCodeBlockId(codeIndex);
    const firstLine = (code.textContent || '').split('\n').find((l) => l.trim())?.trim() || '';
    const preview = firstLine.length > 60 ? firstLine.slice(0, 57) + '...' : firstLine;
    symbols.push({
      type: 'symbol',
      id: pre.id,
      title: preview || `[${language}]`,
      kind: 'code',
      language,
    });
    codeIndex++;
  });

  return symbols;
}

const rawData = document.getElementById('palette-pages-data')?.textContent;
if (rawData) {
  try {
    const parsed = JSON.parse(rawData);
    PAGES = parsed.map((p: any) => ({
      type: 'page' as const,
      title: p.title,
      url: p.url,
      category: p.category,
      categorySlug: p.categorySlug,
    }));
  } catch {}
}

export function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '');
}

export function tokenize(text: string): string[] {
  return text.toLowerCase().split(/\s+/).filter(Boolean);
}

/** Extract unique categories from pages with article count */
export function getUniqueCategories(pages: PaletteItem[] = PAGES): { name: string; slug: string; count: number }[] {
  const map = new Map<string, { name: string; slug: string; count: number }>();
  for (const p of pages) {
    if (p.type !== 'page') continue;
    const key = p.categorySlug;
    if (!map.has(key)) {
      map.set(key, { name: p.category, slug: p.categorySlug, count: 0 });
    }
    map.get(key)!.count++;
  }
  return Array.from(map.values());
}

export function filterPaletteItems(
  query: string,
  mode: FilterMode,
  categoryFilter: string | null,
  pages: PaletteItem[] = PAGES,
  commands: PaletteItem[] = COMMANDS,
  symbols: PaletteSymbolItem[] = SYMBOLS,
): PaletteItem[] {
  const trimmed = query.trim();

  // ── Empty / plain text: show recent + pages ──
  if (mode === 'all') {
    if (!trimmed) {
      const recent = getRecentPages();
      const pageItems = pages.filter((p): p is PaletteItem & { url: string; type: 'page' } => p.type === 'page');
      const remaining = pageItems.filter((p) => !recent.some((r) => r.url === p.url));
      return [...recent, ...remaining].slice(0, 30);
    }
  }

  // ── Category suggestion mode (@ typed, category not yet committed) ──
  if (mode === 'category' && categoryFilter === null) {
    const categories = getUniqueCategories();
    const searchTerm = normalize(trimmed);
    const filtered = categories.filter(
      (c) =>
        !searchTerm ||
        normalize(c.name).includes(searchTerm) ||
        normalize(c.slug).includes(searchTerm),
    );
    return filtered
      .map(
        (c) =>
          ({ type: 'category-suggestion', ...c }) as PaletteItem,
      )
      .slice(0, 20);
  }

  // ── Symbol mode: search within current page ──
  if (mode === 'symbol') {
    if (!trimmed) return symbols.slice(0, 30);
    const tokens = tokenize(trimmed);
    return symbols.filter((s) => {
      const haystack = normalize(s.title + (s.language || '') + s.kind);
      return tokens.every((t) => haystack.includes(t));
    }).slice(0, 30);
  }

  // ── Normal item search (pool is pages or commands, never category-suggestion) ──
  let pool: PaletteItem[] = mode === 'command' ? commands : pages;

  if (categoryFilter) {
    const catNorm = normalize(categoryFilter);
    pool = pool.filter(
      (i) =>
        i.type === 'page' &&
        (normalize(i.category).includes(catNorm) ||
          normalize(i.categorySlug).includes(catNorm)),
    );
  }

  if (!trimmed) {
    return pool.slice(0, 30);
  }

  const tokens = tokenize(trimmed);

  if (mode === 'command') {
    return pool.filter((i): i is PaletteItem & { title: string; id?: string } => {
      if (i.type === 'category-suggestion') return false;
      const haystack = normalize(i.title + (i.type === 'command' ? i.id ?? '' : ''));
      return tokens.every((t) => haystack.includes(t));
    }).slice(0, 30);
  }

  return pool.filter((i): i is PaletteItem & { title: string; category: string } => {
    if (i.type === 'category-suggestion' || i.type === 'symbol') return false;
    const haystack = normalize(i.title + i.category);
    return tokens.every((t) => haystack.includes(t));
  }).slice(0, 30);
}

export function parseQuery(
  query: string,
): { mode: FilterMode; categoryFilter: string | null; displayQuery: string } {
  const trimmed = query.trim();

  if (trimmed.startsWith('>')) {
    return { mode: 'command', categoryFilter: null, displayQuery: trimmed.slice(1).trim() };
  }

  if (trimmed.startsWith('#')) {
    return { mode: 'symbol', categoryFilter: null, displayQuery: trimmed.slice(1).trim() };
  }

  if (trimmed.startsWith('@')) {
    // Use original (untrimmed) query to detect trailing space after category name
    // e.g. '@engineering ' → afterAt = 'engineering ' → space commits the category
    const afterAt = query.slice(query.indexOf('@') + 1);
    const spaceIdx = afterAt.indexOf(' ');
    if (spaceIdx >= 0) {
      // Category committed (space typed after category name)
      const catQuery = afterAt.slice(0, spaceIdx).trim();
      const afterCat = afterAt.slice(spaceIdx + 1).trim();
      return { mode: 'category', categoryFilter: catQuery || null, displayQuery: afterCat };
    }
    // Still selecting category — show suggestions, filter by what's typed
    return { mode: 'category', categoryFilter: null, displayQuery: trimmed.slice(1).trim() };
  }

  return { mode: 'all', categoryFilter: null, displayQuery: trimmed };
}

export function formatKeysForDisplay(keys: string): string {
  return keys
    .split(/\s+/)
    .map((stroke) =>
      stroke
        .split('+')
        .map((part) => {
          if (part === 'ctrl') return 'Ctrl';
          if (part === 'shift') return 'Shift';
          if (part === 'alt') return 'Alt';
          if (part === 'meta') return 'Meta';
          return part;
        })
        .join('+'),
    )
    .join(' ');
}

export function setupCommandPalette(runtime: HotkeyRuntime) {
  const overlay = document.getElementById('command-palette-overlay') as HTMLElement;
  const input = document.getElementById('palette-input') as HTMLInputElement;
  const results = document.getElementById('palette-results') as HTMLElement;
  const badge = document.getElementById('palette-mode-badge') as HTMLElement;
  const shortcuts = document.getElementById('palette-shortcuts') as HTMLElement;
  if (!overlay || !input || !results || !badge || !shortcuts) return;

  // Initialize COMMANDS dynamically from hotkey runtime
  const hotkeyCommands = runtime.getCommands();
  const hotkeyBindings = runtime.getBindings();

  COMMANDS = hotkeyCommands.map((cmd) => {
    const binding = hotkeyBindings.find((b) => b.commandId === cmd.id);
    const keysDisplay = binding ? formatKeysForDisplay(binding.keys) : undefined;
    return {
      type: 'command',
      id: cmd.id,
      title: cmd.title,
      category: cmd.category ?? '系统',
      keys: keysDisplay,
    };
  });

  let activeIndex = -1;

  function getModeLabel(mode: string, filter: string | null): string {
    if (mode === 'command') return '命令';
    if (mode === 'symbol') return '页内符号';
    if (mode === 'category' && filter) return `分类: ${filter}`;
    if (mode === 'category' && !filter) return '选择分类';
    return '';
  }

  function render() {
    const raw = input.value;
    const parsed = parseQuery(raw);
    if (parsed.mode === 'symbol') {
      SYMBOLS = scanPageSymbols();
    }
    const items = filterPaletteItems(parsed.displayQuery, parsed.mode, parsed.categoryFilter);
    const label = getModeLabel(parsed.mode, parsed.categoryFilter);

    shortcuts.style.display = raw.trim() === '' ? 'flex' : 'none';

    badge.className =
      'rounded-md px-2 py-0.5 text-xs font-medium ' +
      (parsed.mode === 'command'
        ? 'inline bg-accent/10 text-accent dark:bg-brand-400/10 dark:text-brand-400'
        : parsed.mode === 'symbol'
          ? 'inline bg-[#8B5CF6]/10 text-[#8B5CF6] dark:bg-[#A78BFA]/10 dark:text-[#A78BFA]'
          : parsed.mode === 'category'
            ? 'inline bg-[#2563EB]/10 text-[#2563EB] dark:bg-[#60A5FA]/10 dark:text-[#60A5FA]'
            : 'hidden');
    badge.textContent = label || '';
    badge.style.display = label ? '' : 'none';

    if (items.length === 0) {
      results.innerHTML = `<div class="px-5 py-8 text-center text-[13px] text-dim dark:text-subtle">无结果</div>`;
      activeIndex = -1;
      return;
    }

    activeIndex = Math.min(activeIndex, items.length - 1);
    if (activeIndex < 0) activeIndex = 0;

    results.innerHTML = items
      .map((item, i) => {
        const isActive = i === activeIndex;
        const activeClass = isActive
          ? 'bg-accent/10 dark:bg-brand-400/10'
          : 'hover:bg-muted dark:hover:bg-border';

        // ── Category suggestion item ──
        if (item.type === 'category-suggestion') {
          return `
      <button class="palette-item w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors duration-100 ${activeClass}" data-index="${i}">
        <span class="shrink-0 text-[#8B5CF6] dark:text-[#A78BFA]">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2H2v10l9.29 9.29a2 2 0 0 0 2.83 0l6.17-6.17a2 2 0 0 0 0-2.83L12 2Z"></path>
            <path d="M7 7h.01"></path>
          </svg>
        </span>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-foreground truncate">${item.name}</div>
          <div class="text-xs text-dim dark:text-subtle">${item.count} 篇文章</div>
        </div>
        <span class="shrink-0 text-[11px] font-mono text-dim dark:text-subtle">@${item.slug}</span>
      </button>`;
        }

        // ── Symbol item ──
        if (item.type === 'symbol') {
          const isHeading = item.kind.startsWith('heading');
          const symbolLabel = isHeading
            ? item.kind === 'heading-2' ? 'H2' : 'H3'
            : (item.language || 'code');
          return `
      <button class="palette-item w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors duration-100 ${activeClass}" data-index="${i}">
        <span class="shrink-0 ${
          isHeading
            ? 'text-[#059669] dark:text-[#34D399]'
            : 'text-[#8B5CF6] dark:text-[#A78BFA]'
        }">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            ${
              isHeading
                ? '<path d="M6 4v16M18 4v16M4 12h16"></path>'
                : '<polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline>'
            }
          </svg>
        </span>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-foreground truncate">${item.title}</div>
          <div class="text-xs text-dim dark:text-subtle truncate">${symbolLabel}</div>
        </div>
      </button>`;
        }

        // ── Page / Command item ──
        return `
      <button class="palette-item w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors duration-100 ${activeClass}" data-index="${i}">
        <span class="shrink-0 ${
          item.type === 'page'
            ? 'text-dim dark:text-subtle'
            : 'text-accent dark:text-brand-400'
        }">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            ${
              item.type === 'page'
                ? '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line>'
                : '<polyline points="14 7 10 12 14 17"></polyline>'
            }
          </svg>
        </span>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-foreground truncate">${item.title}</div>
          <div class="text-xs text-dim dark:text-subtle truncate">${
            item.type === 'page'
              ? item.category
              : item.category + (item.keys ? ' · ' + item.keys : '')
          }</div>
        </div>
      </button>`;
      })
      .join('');

    const el = results.querySelector(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }

  function selectCategory(slug: string) {
    activeIndex = -1;
    input.value = `@${slug} `;
    // Move cursor to end
    input.setSelectionRange(input.value.length, input.value.length);
    render();
    input.focus();
  }

  function executeSelected() {
    const raw = input.value;
    const parsed = parseQuery(raw);
    const items = filterPaletteItems(parsed.displayQuery, parsed.mode, parsed.categoryFilter);
    const item = items[activeIndex];
    if (!item) return;

    // ── Category suggestion: insert @slug into input ──
    if (item.type === 'category-suggestion') {
      selectCategory(item.slug);
      return;
    }

    // ── Symbol: scroll to element ──
    if (item.type === 'symbol') {
      closePalette();
      const el = document.getElementById(item.id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-accent/50', 'dark:ring-brand-400/50', 'rounded', 'transition-all', 'duration-300');
        setTimeout(() => {
          el.classList.remove('ring-2', 'ring-accent/50', 'dark:ring-brand-400/50', 'rounded', 'transition-all', 'duration-300');
        }, 2000);
      }
      return;
    }

    closePalette();

    if (item.type === 'page') {
      addRecent(item.url);
      window.location.href = item.url;
    } else if (item.type === 'command') {
      runtime.executeCommand(item.id);
    }
  }

  function closePalette() {
    overlay.style.display = 'none';
    document.body.style.overflow = '';
    runtime.setMode('normal');
    runtime.setFlag('palette.open', false);
    input.blur();
  }

  let renderTimer: ReturnType<typeof setTimeout>;
  input.addEventListener('input', () => {
    activeIndex = -1;
    clearTimeout(renderTimer);
    renderTimer = setTimeout(render, 80);
  });

  function isPaletteToggleShortcut(e: KeyboardEvent): boolean {
    const ctrl = e.ctrlKey || e.metaKey;
    if (!ctrl) return false;
    if (e.key === 'p') return true;
    if (e.key === 'P') return true;
    if (e.key === 'e') return true;
    return false;
  }

  input.addEventListener('keydown', (e) => {
    // Toggle palette closed via same shortcuts that opened it
    if (isPaletteToggleShortcut(e)) {
      e.preventDefault();
      closePalette();
      return;
    }

    const items = results?.querySelectorAll('.palette-item') ?? [];
    const len = items.length;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, len - 1);
      render();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      render();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      executeSelected();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closePalette();
    }
  });

  // Click on category suggestion items to select
  results.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.palette-item') as HTMLElement | null;
    if (!btn) return;
    const idx = parseInt(btn.dataset.index ?? '-1', 10);
    if (idx < 0) return;
    activeIndex = idx;
    executeSelected();
  });

  // Click on mode shortcut buttons
  shortcuts.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.palette-mode-btn') as HTMLElement | null;
    if (!btn) return;
    const mode = btn.dataset.mode;
    if (!mode) return;
    const prefix = mode === 'command' ? '> ' : mode === 'category' ? '@ ' : '# ';
    activeIndex = -1;
    input.value = prefix;
    render();
    input.focus();
    input.setSelectionRange(prefix.length, prefix.length);
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closePalette();
  });

  function openPalette(prefill: string) {
    activeIndex = -1;
    input.value = prefill || '';
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    runtime.setMode('command');
    runtime.setFlag('palette.open', true);
    SYMBOLS = [];
    render();
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }

  function isPaletteOpen(): boolean {
    return overlay.style.display !== 'none';
  }

  (window as any).togglePalette = function (prefill: string) {
    if (isPaletteOpen()) {
      closePalette();
    } else {
      openPalette(prefill);
    }
  };

  // Backward compat alias
  (window as any).__openPalette = (window as any).togglePalette;

}

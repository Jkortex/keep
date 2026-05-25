import type { HotkeyRuntime } from '../lib/hotkeys/types';
import type { PaletteItem } from '../lib/palette';

const COMMANDS: PaletteItem[] = [
  { type: 'command', id: 'app.nav.home', title: '回到首页', category: '导航', keys: 'g h' },
  { type: 'command', id: 'app.theme.toggle', title: '切换主题', category: '系统', keys: 't' },
  { type: 'command', id: 'app.palette.open', title: '命令面板', category: '导航', keys: 'Ctrl+P' },
  { type: 'command', id: 'app.search.open', title: '搜索页面', category: '导航', keys: '/' },
  { type: 'command', id: 'app.help.toggle', title: '快捷键帮助', category: '系统', keys: '?' },
];

let PAGES: PaletteItem[] = [];

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

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '');
}

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/\s+/).filter(Boolean);
}

export function filterPaletteItems(
  query: string,
  mode: 'all' | 'command' | 'category',
  categoryFilter: string | null,
): PaletteItem[] {
  const trimmed = query.trim();

  let pool: PaletteItem[];
  pool = mode === 'command' ? COMMANDS : [...PAGES, ...(mode === 'all' ? COMMANDS : [])];

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
  } else {
    const tokens = tokenize(trimmed);

    if (mode === 'command') {
      items = pool.filter((i) => {
        const haystack = normalize(i.title + (i.type === 'command' ? (i as any).id : ''));
        return tokens.every((t) => haystack.includes(t));
      });
    } else {
      items = pool.filter((i) => {
        const haystack = normalize(i.title + i.category);
        return tokens.every((t) => haystack.includes(t));
      });
    }
  }

  return items.slice(0, 30);
}

export function parseQuery(
  query: string,
): { mode: 'all' | 'command' | 'category'; categoryFilter: string | null; displayQuery: string } {
  const trimmed = query.trim();

  if (trimmed.startsWith('>')) {
    return { mode: 'command', categoryFilter: null, displayQuery: trimmed.slice(1).trim() };
  }

  if (trimmed.startsWith('@')) {
    const rest = trimmed.slice(1).trim();
    const spaceIdx = rest.indexOf(' ');
    const catQuery = spaceIdx >= 0 ? rest.slice(0, spaceIdx) : rest;
    const afterCat = spaceIdx >= 0 ? rest.slice(spaceIdx + 1) : '';
    return { mode: 'category', categoryFilter: catQuery || null, displayQuery: afterCat };
  }

  return { mode: 'all', categoryFilter: null, displayQuery: trimmed };
}

export function setupCommandPalette(runtime: HotkeyRuntime) {
  const overlay = document.getElementById('command-palette-overlay');
  const input = document.getElementById('palette-input') as HTMLInputElement | null;
  const results = document.getElementById('palette-results');
  const badge = document.getElementById('palette-mode-badge');
  if (!overlay || !input || !results || !badge) return;

  let activeIndex = -1;

  const categoryNames: Record<string, string> = {};

  function getModeLabel(mode: string, filter: string | null): string {
    if (mode === 'command') return '命令';
    if (mode === 'category' && filter) return `分类: ${filter}`;
    return '';
  }

  function render() {
    const raw = input.value;
    const parsed = parseQuery(raw);
    const items = filterPaletteItems(parsed.displayQuery, parsed.mode, parsed.categoryFilter);
    const label = getModeLabel(parsed.mode, parsed.categoryFilter);

    badge.className =
      'rounded-md px-2 py-0.5 text-[11px] font-medium ' +
      (parsed.mode === 'command'
        ? 'inline bg-[#059669]/10 text-[#059669] dark:bg-[#34D399]/10 dark:text-[#34D399]'
        : parsed.mode === 'category'
          ? 'inline bg-[#2563EB]/10 text-[#2563EB] dark:bg-[#60A5FA]/10 dark:text-[#60A5FA]'
          : 'hidden');
    badge.textContent = label || '';
    badge.style.display = label ? '' : 'none';

    if (items.length === 0) {
      results.innerHTML = `<div class="px-5 py-8 text-center text-[13px] text-[#9CA3AF] dark:text-[#6B7280]">无结果</div>`;
      activeIndex = -1;
      return;
    }

    activeIndex = Math.min(activeIndex, items.length - 1);
    if (activeIndex < 0) activeIndex = 0;

    results.innerHTML = items
      .map(
        (item, i) => `
      <button class="palette-item w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors duration-100 ${
        i === activeIndex
          ? 'bg-[#059669]/10 dark:bg-[#34D399]/10'
          : 'hover:bg-[#F3F4F6] dark:hover:bg-[#374151]'
      }" data-index="${i}">
        <span class="shrink-0 ${
          item.type === 'page'
            ? 'text-[#9CA3AF] dark:text-[#6B7280]'
            : 'text-[#059669] dark:text-[#34D399]'
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
          <div class="text-[14px] font-medium text-[#1A1A1A] dark:text-[#F3F4F6] truncate">${
            item.type === 'page' ? item.title : item.title
          }</div>
          <div class="text-[12px] text-[#9CA3AF] dark:text-[#6B7280] truncate">${
            item.type === 'page'
              ? item.category
              : item.category + (item.keys ? ' · ' + item.keys : '')
          }</div>
        </div>
      </button>`,
      )
      .join('');

    const el = results.querySelector(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }

  function executeSelected() {
    const raw = input.value;
    const parsed = parseQuery(raw);
    const items = filterPaletteItems(parsed.displayQuery, parsed.mode, parsed.categoryFilter);
    const item = items[activeIndex];
    if (!item) return;

    closePalette();

    if (item.type === 'page') {
      window.location.href = item.url;
    } else {
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

  // Event handlers
  input.addEventListener('input', () => {
    activeIndex = -1;
    render();
  });

  input.addEventListener('keydown', (e) => {
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

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closePalette();
  });

  (window as any).__openPalette = function (prefill: string) {
    activeIndex = -1;
    input.value = prefill || '';
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    runtime.setMode('command');
    runtime.setFlag('palette.open', true);
    render();
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  };
}

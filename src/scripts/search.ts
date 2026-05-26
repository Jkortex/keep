import type { Pagefind, PagefindResult } from '../lib/pagefind-types';

let pagefindInstance: Pagefind | null = null;

async function getPagefind(): Promise<Pagefind> {
  if (pagefindInstance) return pagefindInstance;
  try {
    // Runtime dynamic import — resolved by Pagefind at runtime, not by Vite
    const imp = new Function('p', 'return import(p)');
    const mod: Pagefind = await imp('/pagefind/pagefind.js');
    pagefindInstance = mod;
  } catch {
    pagefindInstance = { search: async () => ({ results: [], total: 0 }) } as unknown as Pagefind;
  }
  return pagefindInstance;
}

export function setupSearch() {
  const input = document.getElementById('search-input') as HTMLInputElement | null;
  const results = document.getElementById('search-results') as HTMLElement | null;
  const countEl = document.getElementById('search-count') as HTMLElement | null;
  if (!input || !results) return;

  // Non-null references for inner functions
  const $results: HTMLElement = results;
  const $countEl: HTMLElement | null = countEl;

  let activeIndex = -1;
  let resultLinks: HTMLAnchorElement[] = [];

  function updateActiveItem() {
    const items = $results.querySelectorAll<HTMLAnchorElement>('a');
    resultLinks = [...items];
    resultLinks.forEach((el, i) => {
      if (i === activeIndex) {
        el.classList.add('ring-2', 'ring-[#059669]', 'dark:ring-[#34D399]');
        el.scrollIntoView({ block: 'nearest' });
      } else {
        el.classList.remove('ring-2', 'ring-[#059669]', 'dark:ring-[#34D399]');
      }
    });
  }

  function renderEmpty() {
    $results.innerHTML = '';
    if ($countEl) $countEl.textContent = '';
  }

  function renderNoResults(query: string) {
    $results.innerHTML = `<p class="text-[15px] text-[#9CA3AF] dark:text-[#6B7280]">未找到 "<strong>${escapeHtml(query)}</strong>" 相关结果</p>`;
    if ($countEl) $countEl.textContent = '';
  }

  function renderLoading() {
    $results.innerHTML = `<div class="flex items-center justify-center py-12"><div class="h-5 w-5 animate-spin rounded-full border-2 border-[#E5E7EB] border-t-[#059669] dark:border-[#374151] dark:border-t-[#34D399]"></div><span class="ml-3 text-[14px] text-[#9CA3AF] dark:text-[#6B7280]">搜索中…</span></div>`;
  }

  async function doSearch(query: string) {
    const trimmed = query.trim();
    if (!trimmed) {
      renderEmpty();
      return;
    }

    // Sync URL
    const url = new URL(window.location.href);
    if (url.searchParams.get('q') !== trimmed) {
      url.searchParams.set('q', trimmed);
      window.history.replaceState({}, '', url.toString());
    }

    renderLoading();

    const pf = await getPagefind();
    const res = await pf.search(trimmed);

    if (!res.results?.length) {
      renderNoResults(trimmed);
      return;
    }

    const items = await Promise.all(
      res.results.slice(0, 20).map((r: PagefindResult) => r.data()),
    );

    if ($countEl) {
      $countEl.textContent = `找到 ${res.results.length} 条结果`;
    }

    $results.innerHTML = items
      .map(
        (item: any) => `
      <a href="${item.url}" class="search-result block rounded-lg border border-[#E5E7EB] bg-white p-4 mb-3 no-underline transition-colors duration-200 hover:bg-[#F9FAF7] dark:border-[#374151] dark:bg-[#1F2937] dark:hover:bg-[#1A221E]">
        <div class="text-[15px] font-medium text-[#1A1A1A] dark:text-[#F3F4F6]">${item.meta?.title || item.url}</div>
        <div class="mt-1.5 flex flex-wrap items-center gap-2 text-[12px]">
          ${item.meta?.category ? `<span class="rounded-md bg-[#ECFDF5] px-1.5 py-0.5 font-medium text-[#059669] dark:bg-[rgba(5,150,105,0.1)] dark:text-[#34D399]">${escapeHtml(item.meta.category)}</span>` : ''}
          ${item.meta?.date ? `<span class="text-[#9CA3AF] dark:text-[#6B7280]">${escapeHtml(item.meta.date)}</span>` : ''}
        </div>
        ${item.excerpt ? `<div class="mt-1.5 text-[13px] leading-relaxed text-[#6B7280] dark:text-[#9CA3AF]">${item.excerpt}</div>` : ''}
      </a>`,
      )
      .join('');

    activeIndex = -1;
  }

  let debounceTimer: ReturnType<typeof setTimeout>;
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    activeIndex = -1;
    debounceTimer = setTimeout(() => doSearch(input.value), 150);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'j') {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, resultLinks.length - 1);
      updateActiveItem();
    } else if (e.key === 'ArrowUp' || e.key === 'k') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      updateActiveItem();
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      resultLinks[activeIndex]?.click();
    }
  });

  // Initial search from URL param
  const params = new URLSearchParams(window.location.search);
  const q = params.get('q');
  if (q) {
    input.value = q;
    doSearch(q);
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseQuery,
  normalize,
  tokenize,
  formatKeysForDisplay,
  filterPaletteItems,
  getUniqueCategories,
} from '../../../src/scripts/command-palette';
import type { PaletteItem, PaletteSymbolItem } from '../../../src/lib/palette';

describe('normalize', () => {
  it('lowercases text', () => {
    expect(normalize('Hello World')).toBe('helloworld');
  });

  it('removes all whitespace', () => {
    expect(normalize('  a  b  c  ')).toBe('abc');
  });

  it('handles empty string', () => {
    expect(normalize('')).toBe('');
  });
});

describe('tokenize', () => {
  it('splits into lowercase tokens', () => {
    expect(tokenize('Hello World')).toEqual(['hello', 'world']);
  });

  it('filters out empty tokens', () => {
    expect(tokenize('  a   b  ')).toEqual(['a', 'b']);
  });

  it('returns empty array for empty input', () => {
    expect(tokenize('')).toEqual([]);
  });
});

describe('formatKeysForDisplay', () => {
  it('formats simple key', () => {
    expect(formatKeysForDisplay('t')).toBe('t');
  });

  it('formats ctrl+key combination', () => {
    expect(formatKeysForDisplay('ctrl+p')).toBe('Ctrl+p');
  });

  it('formats multi-stroke sequence', () => {
    expect(formatKeysForDisplay('g h')).toBe('g h');
  });

  it('capitalizes modifier keys', () => {
    expect(formatKeysForDisplay('ctrl+shift+f')).toBe('Ctrl+Shift+f');
    expect(formatKeysForDisplay('alt+meta')).toBe('Alt+Meta');
  });
});

describe('parseQuery', () => {
  it('returns mode=all for plain text', () => {
    const result = parseQuery('hello world');
    expect(result).toEqual({
      mode: 'all',
      categoryFilter: null,
      displayQuery: 'hello world',
    });
  });

  it('returns mode=command for > prefix', () => {
    const result = parseQuery('>theme');
    expect(result).toEqual({
      mode: 'command',
      categoryFilter: null,
      displayQuery: 'theme',
    });
  });

  it('strips leading whitespace from command query', () => {
    const result = parseQuery('>  theme');
    expect(result.displayQuery).toBe('theme');
  });

  it('returns mode=category for @ prefix without space', () => {
    const result = parseQuery('@css');
    expect(result).toEqual({
      mode: 'category',
      categoryFilter: null,
      displayQuery: 'css',
    });
  });

  it('commits category when space is typed after @slug', () => {
    const result = parseQuery('@css flexbox');
    expect(result).toEqual({
      mode: 'category',
      categoryFilter: 'css',
      displayQuery: 'flexbox',
    });
  });

  it('commits with null filter when @ is followed only by space', () => {
    const result = parseQuery('@ ');
    expect(result).toEqual({
      mode: 'category',
      categoryFilter: null,
      displayQuery: '',
    });
  });

  it('handles empty query', () => {
    const result = parseQuery('');
    expect(result).toEqual({
      mode: 'all',
      categoryFilter: null,
      displayQuery: '',
    });
  });

  it('returns mode=symbol for # prefix', () => {
    const result = parseQuery('#flexbox');
    expect(result).toEqual({
      mode: 'symbol',
      categoryFilter: null,
      displayQuery: 'flexbox',
    });
  });

  it('strips leading whitespace after #', () => {
    const result = parseQuery('#  heading');
    expect(result.displayQuery).toBe('heading');
  });

  it('returns symbol mode with empty displayQuery for bare #', () => {
    const result = parseQuery('#');
    expect(result).toEqual({
      mode: 'symbol',
      categoryFilter: null,
      displayQuery: '',
    });
  });
});

describe('getUniqueCategories', () => {
  const pages: PaletteItem[] = [
    { type: 'page', title: 'A', url: '/a', category: 'CSS', categorySlug: 'css' },
    { type: 'page', title: 'B', url: '/b', category: 'CSS', categorySlug: 'css' },
    { type: 'page', title: 'C', url: '/c', category: '工程实践', categorySlug: 'engineering' },
  ];

  it('groups pages by category slug with counts', () => {
    const cats = getUniqueCategories(pages);
    expect(cats).toEqual([
      { name: 'CSS', slug: 'css', count: 2 },
      { name: '工程实践', slug: 'engineering', count: 1 },
    ]);
  });

  it('ignores non-page items', () => {
    const mixed: PaletteItem[] = [
      ...pages,
      { type: 'command', id: 'x', title: 'X', category: '系统' },
    ];
    const cats = getUniqueCategories(mixed);
    expect(cats).toHaveLength(2);
  });
});

describe('filterPaletteItems', () => {
  const pages: PaletteItem[] = [
    { type: 'page', title: 'CSS Flexbox Guide', url: '/css/flexbox', category: 'CSS 示例', categorySlug: 'css' },
    { type: 'page', title: 'CSS Grid Layout', url: '/css/grid', category: 'CSS 示例', categorySlug: 'css' },
    { type: 'page', title: 'MySQL Indexing', url: '/mysql/indexing', category: 'MySQL 笔记', categorySlug: 'mysql' },
  ];

  const commands: PaletteItem[] = [
    { type: 'command', id: 'app.theme.toggle', title: '切换主题', category: '系统', keys: 'T' },
    { type: 'command', id: 'app.nav.home', title: '回到首页', category: '导航', keys: 'G H' },
  ];

  describe('mode=all', () => {
    it('returns all pages when query is empty (no recents)', () => {
      const result = filterPaletteItems('', 'all', null, pages, commands);
      expect(result).toHaveLength(3);
      expect(result.every((i) => i.type === 'page')).toBe(true);
    });

    it('filters pages by title match', () => {
      const result = filterPaletteItems('flexbox', 'all', null, pages, commands);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('CSS Flexbox Guide');
    });

    it('filters by category name match', () => {
      const result = filterPaletteItems('MySQL', 'all', null, pages, commands);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('MySQL Indexing');
    });

    it('returns empty array when no match', () => {
      const result = filterPaletteItems('zzznonexistent', 'all', null, pages, commands);
      expect(result).toHaveLength(0);
    });
  });

  describe('mode=command', () => {
    it('returns all commands when displayQuery is empty', () => {
      const result = filterPaletteItems('', 'command', null, pages, commands);
      expect(result).toHaveLength(2);
    });

    it('filters commands by title match', () => {
      const result = filterPaletteItems('主题', 'command', null, pages, commands);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('app.theme.toggle');
    });

    it('searches in id as well', () => {
      const result = filterPaletteItems('home', 'command', null, pages, commands);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('app.nav.home');
    });
  });

  describe('mode=symbol', () => {
    const symbols: PaletteSymbolItem[] = [
      { type: 'symbol', id: 'intro', title: '引言', kind: 'heading-2' },
      { type: 'symbol', id: 'usage', title: '使用方法', kind: 'heading-2' },
      { type: 'symbol', id: 'details', title: '高级配置', kind: 'heading-3' },
      { type: 'symbol', id: 'code-0', title: 'const x = 1', kind: 'code', language: 'typescript' },
      { type: 'symbol', id: 'code-1', title: 'print("hello")', kind: 'code', language: 'python' },
    ];

    it('returns all symbols when displayQuery is empty', () => {
      const result = filterPaletteItems('', 'symbol', null, [], [], symbols);
      expect(result).toHaveLength(5);
    });

    it('filters symbols by title', () => {
      const result = filterPaletteItems('引言', 'symbol', null, [], [], symbols);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(symbols[0]);
    });

    it('filters symbols by language', () => {
      const result = filterPaletteItems('python', 'symbol', null, [], [], symbols);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('code-1');
    });

    it('filters symbols by kind', () => {
      const result = filterPaletteItems('heading', 'symbol', null, [], [], symbols);
      expect(result).toHaveLength(3);
    });

    it('returns empty array when no match', () => {
      const result = filterPaletteItems('zzznonexistent', 'symbol', null, [], [], symbols);
      expect(result).toHaveLength(0);
    });
  });

  describe('mode=category with filter', () => {
    it('filters pages by category slug', () => {
      const result = filterPaletteItems('', 'category', 'css', pages, commands);
      expect(result).toHaveLength(2);
      expect(result.every((i) => i.type === 'page')).toBe(true);
    });

    it('filters pages by category slug with text query', () => {
      const result = filterPaletteItems('flexbox', 'category', 'css', pages, commands);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('CSS Flexbox Guide');
    });

    it('filters pages by category name', () => {
      const result = filterPaletteItems('', 'category', 'CSS 示例', pages, commands);
      expect(result).toHaveLength(2);
    });

    it('returns empty when no pages match category', () => {
      const result = filterPaletteItems('', 'category', 'nonexistent', pages, commands);
      expect(result).toHaveLength(0);
    });
  });
});

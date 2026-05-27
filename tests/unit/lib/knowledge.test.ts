import { describe, it, expect } from 'vitest';
import {
  getCategorySlug,
  getCategoryLabel,
  sortByOrder,
  sortByCreated,
} from '../../../src/lib/knowledge';

function makeArticle(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    data: {
      title: 'test',
      category: 'test',
      tags: [],
      order: 0,
      ...overrides,
    },
  } as any;
}

describe('getCategorySlug', () => {
  it('extracts category slug from article id', () => {
    expect(getCategorySlug(makeArticle('css/box-model'))).toBe('css');
    expect(getCategorySlug(makeArticle('principles/single-responsibility'))).toBe('principles');
  });

  it('handles single-segment id', () => {
    expect(getCategorySlug(makeArticle('uncategorized'))).toBe('uncategorized');
  });
});

describe('getCategoryLabel', () => {
  it('returns the mapped title for known categories', () => {
    expect(getCategoryLabel('css')).toBe('CSS 示例');
    expect(getCategoryLabel('principles')).toBe('软件工程原则');
  });

  it('returns the slug itself for unknown categories', () => {
    expect(getCategoryLabel('unknown-category')).toBe('unknown-category');
  });
});

describe('sortByOrder', () => {
  it('sorts articles by order ascending', () => {
    const articles = [
      makeArticle('a', { order: 3 }),
      makeArticle('b', { order: 1 }),
      makeArticle('c', { order: 2 }),
    ];
    const sorted = sortByOrder(articles);
    expect(sorted.map((a) => a.id)).toEqual(['b', 'c', 'a']);
  });

  it('treats missing order as 0', () => {
    const articles = [
      makeArticle('a'),
      makeArticle('b', { order: 1 }),
    ];
    const sorted = sortByOrder(articles);
    expect(sorted.map((a) => a.id)).toEqual(['a', 'b']);
  });

  it('does not mutate the original array', () => {
    const articles = [
      makeArticle('a', { order: 2 }),
      makeArticle('b', { order: 1 }),
    ];
    const sorted = sortByOrder(articles);
    expect(articles[0].id).toBe('a');
    expect(sorted).not.toBe(articles);
  });
});

describe('sortByCreated', () => {
  it('sorts by created date descending, then order ascending', () => {
    const d1 = new Date('2024-01-03');
    const d2 = new Date('2024-01-02');
    const d3 = new Date('2024-01-01');
    const articles = [
      makeArticle('a', { created: d1, order: 0 }),
      makeArticle('b', { created: d2, order: 2 }),
      makeArticle('c', { created: d3, order: 1 }),
    ];
    const sorted = sortByCreated(articles);
    expect(sorted.map((a) => a.id)).toEqual(['a', 'b', 'c']);
  });

  it('uses order as tiebreaker when dates are equal', () => {
    const date = new Date('2024-01-01');
    const articles = [
      makeArticle('a', { created: date, order: 3 }),
      makeArticle('b', { created: date, order: 1 }),
      makeArticle('c', { created: date, order: 2 }),
    ];
    const sorted = sortByCreated(articles);
    expect(sorted.map((a) => a.id)).toEqual(['b', 'c', 'a']);
  });

  it('handles missing created dates', () => {
    const articles = [
      makeArticle('a', { created: new Date('2024-01-02') }),
      makeArticle('b'),
      makeArticle('c', { created: new Date('2024-01-01') }),
    ];
    const sorted = sortByCreated(articles);
    expect(sorted.map((a) => a.id)).toEqual(['a', 'c', 'b']);
  });

  it('does not mutate the original array', () => {
    const articles = [
      makeArticle('a', { created: new Date('2024-01-02') }),
      makeArticle('b', { created: new Date('2024-01-01') }),
    ];
    const sorted = sortByCreated(articles);
    expect(articles[0].id).toBe('a');
    expect(sorted).not.toBe(articles);
  });
});

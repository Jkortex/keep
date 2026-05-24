import type { CollectionEntry } from 'astro:content';

type Article = CollectionEntry<'knowledge'>;

/** 分类注册表 — 唯一事实源
 *
 * 新增分类必须同时在此注册，否则知识内容可以通过 URL 访问,
 * 但不会出现在首页分类列表和分类概览页上。
 * order 控制分类的排列顺序。
 * title 将覆盖文章 frontmatter 中的 `category` 字段。 */
export const CATEGORIES = {
  principles: { title: '软件工程原则', order: 0 },
  css: { title: 'CSS 示例', order: 1 },
  mysql: { title: 'MySQL 笔记', order: 2 },
  redis: { title: 'Redis 笔记', order: 3 },
  engineering: { title: '工程实践', order: 4 },
} as const;

export type CategorySlug = keyof typeof CATEGORIES;

export function getCategorySlug(article: Article): string {
  return article.id.split('/')[0];
}

export function getCategoryLabel(slug: string): string {
  return CATEGORIES[slug as CategorySlug]?.title ?? slug;
}

export function getCategories(articles: Article[]) {
  const counts = new Map<string, number>();
  for (const a of articles) {
    const slug = getCategorySlug(a);
    counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }

  return (Object.keys(CATEGORIES) as CategorySlug[])
    .filter((slug) => counts.has(slug))
    .map((slug) => ({
      slug,
      title: CATEGORIES[slug].title,
      count: counts.get(slug)!,
    }));
}

/** 按 order 升序排列（同分类内排序用） */
export function sortByOrder<T extends Article>(articles: T[]): T[] {
  return [...articles].sort((a, b) => (a.data.order ?? 0) - (b.data.order ?? 0));
}

/** 按 created 降序排列，次 key 为 order 升序（首页 feed 用） */
export function sortByCreated<T extends Article>(articles: T[]): T[] {
  return [...articles].sort((a, b) => {
    const da = a.data.created?.getTime() ?? 0;
    const db = b.data.created?.getTime() ?? 0;
    if (da !== db) return db - da;
    return (a.data.order ?? 0) - (b.data.order ?? 0);
  });
}

/** 按分类分组，返回 slug → articles 映射 */
export function groupByCategory(articles: Article[]): Map<string, Article[]> {
  const map = new Map<string, Article[]>();
  for (const a of articles) {
    const slug = getCategorySlug(a);
    if (!map.has(slug)) map.set(slug, []);
    map.get(slug)!.push(a);
  }
  return map;
}

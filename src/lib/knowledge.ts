import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';

export type Article = CollectionEntry<'knowledge'>;

export interface CategoryInfo {
  slug: string;
  title: string;
  count: number;
}

/** 分类注册表 — 唯一事实源
 *
 * 新增分类必须同时在此注册，否则知识内容可以通过 URL 访问，
 * 但不会出现在首页分类列表和分类概览页上。
 * order 控制分类的排列顺序。
 * title 将覆盖文章 frontmatter 中的 `category` 字段。 */
export const CATEGORIES = {
  principles: { title: '软件工程原则', order: 0 },
  laws: { title: '软件工程定律', order: 1 },
  css: { title: 'CSS 示例', order: 2 },
  mysql: { title: 'MySQL 笔记', order: 3 },
  redis: { title: 'Redis 笔记', order: 4 },
  engineering: { title: '工程实践', order: 5 },
} as const;

export type CategorySlug = keyof typeof CATEGORIES;

/** 从 Entry ID 提取分类 Slug */
export function getCategorySlug(article: Article): string {
  return article.id.split('/')[0];
}

/** 获取分类的显示标题 */
export function getCategoryLabel(slug: string): string {
  return CATEGORIES[slug as CategorySlug]?.title ?? slug;
}

/** 获取包含文章数量的已注册分类列表 */
export async function getCategoriesWithCounts(): Promise<CategoryInfo[]> {
  const articles = await getCollection('knowledge');
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

/** 获取所有文章，按 order 升序排列 */
export async function getArticles(): Promise<Article[]> {
  const articles = await getCollection('knowledge');
  return sortByOrder(articles);
}

/** 获取指定分类的文章，按 order 升序排列 */
export async function getArticlesByCategory(categorySlug: string): Promise<Article[]> {
  const articles = await getCollection('knowledge', (entry) => getCategorySlug(entry) === categorySlug);
  return sortByOrder(articles);
}

/** 按分类分组获取所有文章（已排序） */
export async function getArticlesGroupedByCategory(): Promise<Map<string, Article[]>> {
  const articles = await getArticles();
  const map = new Map<string, Article[]>();
  for (const a of articles) {
    const slug = getCategorySlug(a);
    if (!map.has(slug)) map.set(slug, []);
    map.get(slug)!.push(a);
  }
  return map;
}

import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { getCategorySlug } from '../lib/knowledge';

export async function GET(context) {
  const articles = await getCollection('knowledge');
  articles.sort((a, b) => {
    const da = a.data.created?.getTime() ?? 0;
    const db = b.data.created?.getTime() ?? 0;
    return db - da;
  });

  return rss({
    title: 'Keep — 个人知识库',
    description: '软件工程原则、定律与实践的个人知识库',
    site: context.site,
    items: articles.map((article) => ({
      title: article.data.title,
      link: `/knowledge/${article.id}/`,
      pubDate: article.data.created,
      description: article.data.description,
      categories: [article.data.category],
    })),
  });
}

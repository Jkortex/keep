import { defineCollection } from 'astro:content';
import { z } from 'astro:schema';
import { glob } from 'astro/loaders';

const knowledge = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/knowledge' }),
  schema: z.object({
    title: z.string(),
    /** 分类显示名，如 "软件工程原则" */
    category: z.string(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional().default([]),
    /** 在同分类内的排序权重，越小越靠前 */
    order: z.number().optional().default(0),
    created: z.date().optional(),
    updated: z.date().optional(),
  }),
});

export const collections = { knowledge };

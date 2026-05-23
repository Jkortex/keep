import type { MarkdownHeading } from 'astro';

/** 页面元数据 */
export interface PageMeta {
  title: string;
  description?: string;
}

/** 源码文件片段 */
export interface SourceFile {
  name: string;
  code: string;
}

/** CodeDemo 组件 Props */
export interface CodeDemoProps {
  /** 源码文本 */
  code?: string;
  /** 代码语言 */
  lang?: string;
  /** 多文件场景 */
  files?: SourceFile[];
}

/** 知识分类卡片 */
export interface CategoryCard {
  href: string;
  title: string;
  description: string;
  count: number;
}

/** 知识条目链接 */
export interface KnowledgeLink {
  href: string;
  title: string;
  summary?: string;
}

/** TOC 目录项 */
export type TocItem = MarkdownHeading;

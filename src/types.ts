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

/** TOC 目录项 */
export type TocItem = MarkdownHeading;

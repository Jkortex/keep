export interface PagefindSearchResult {
  results: PagefindResult[];
  total: number;
}

export interface PagefindResult {
  id: string;
  data: () => Promise<PagefindResultData>;
}

export interface PagefindResultData {
  url: string;
  content: string;
  excerpt: string;
  meta: {
    title: string;
    category?: string;
    date?: string;
    [key: string]: unknown;
  };
  sub_results: {
    title: string;
    url: string;
    excerpt: string;
    meta: Record<string, unknown>;
  }[];
}

export interface Pagefind {
  search: (query: string) => Promise<PagefindSearchResult>;
  debouncedSearch: (query: string, options?: { timeout?: number }) => Promise<PagefindSearchResult>;
}

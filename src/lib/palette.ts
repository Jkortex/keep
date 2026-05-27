export interface PalettePageItem {
  title: string
  url: string
  category: string
  categorySlug: string
}

export interface PaletteCommandItem {
  id: string
  title: string
  category: string
  keys?: string
}

export interface PaletteCategorySuggestionItem {
  name: string
  slug: string
  count: number
}

export interface PaletteSymbolItem {
  type: 'symbol'
  id: string
  title: string
  kind: 'heading-2' | 'heading-3' | 'code'
  language?: string
}

export type PaletteItem =
  | { type: 'page'; title: string; url: string; category: string; categorySlug: string }
  | { type: 'command'; id: string; title: string; category: string; keys?: string }
  | PaletteCategorySuggestionItem & { type: 'category-suggestion' }
  | PaletteSymbolItem

export type FilterMode = 'all' | 'command' | 'category' | 'symbol'

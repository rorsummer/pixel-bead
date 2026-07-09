import { request } from './request'

export interface ColorItem {
  code: string
  rgb: [number, number, number]
  hex: string
  name: string
}

let paletteCache: ColorItem[] | null = null

export async function getPalette(): Promise<ColorItem[]> {
  if (paletteCache) return paletteCache
  const res = await request<{ count: number; colors: ColorItem[] }>({
    url: '/api/palette',
  })
  paletteCache = res.colors
  return paletteCache
}

export function groupBySeries(palette: ColorItem[]): Record<string, ColorItem[]> {
  const groups: Record<string, ColorItem[]> = {}
  for (const c of palette) {
    const prefix = c.code.match(/^[A-Z]/)?.[0] || '?'
    if (!groups[prefix]) groups[prefix] = []
    groups[prefix].push(c)
  }
  return groups
}

export const SERIES_INFO: { key: string; name: string }[] = [
  { key: 'A', name: '黄橙' },
  { key: 'B', name: '绿色' },
  { key: 'C', name: '蓝青' },
  { key: 'D', name: '蓝紫' },
  { key: 'E', name: '粉玫' },
  { key: 'F', name: '红色' },
  { key: 'G', name: '棕肤' },
  { key: 'H', name: '黑白' },
  { key: 'M', name: '大地' },
]

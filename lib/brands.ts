export const brands = [
  { id: 't4c', name: "T's for Conspiracy" },
  { id: 'legends', name: 'Goddamn Legends' },
  { id: 'little-monsters', name: 'Little Monsters' },
  { id: 'everyday-originals', name: 'Everyday Originals' }
] as const

export type BrandId = (typeof brands)[number]['id']

export function isBrandId(value: string): value is BrandId {
  return brands.some((brand) => brand.id === value)
}
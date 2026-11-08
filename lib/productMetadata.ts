import 'server-only'
import path from 'node:path'
import { readFile, writeFile, readdir } from 'node:fs/promises'
import type { BrandId } from '@/lib/brands'
import { getArtworkDirectory, isArtworkId } from '@/lib/artworks'
import { productOptions } from '@/lib/productOptions'
import { defaultProductMetadata, type ProductMetadata } from '@/lib/productMetadataTypes'
import { getProductType } from '@/lib/catalog/products'

export async function getProductMetadata( brand: BrandId, id: string ): Promise<ProductMetadata> {
  const filePath = path.join(
    getArtworkDirectory(brand, id),
    'metadata.json'
  )

  try {
    const content = await readFile(filePath, 'utf8')
    const saved = JSON.parse(content) as Partial<ProductMetadata>

    return {
      ...defaultProductMetadata,
      ...saved,
      colors: Array.isArray(saved.colors) ? saved.colors : ['black'],
      sizes: Array.isArray(saved.sizes) ? saved.sizes : [],
      collections: Array.isArray(saved.collections) ? saved.collections : []
    }
  } catch (error) {
    if (
      (error as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      return {
        ...defaultProductMetadata,
        sizes: [],
        collections: []
      }
    }

    throw error
  }
}


export function validateProductMetadata( brand: BrandId, value: unknown ): value is ProductMetadata {
  if (!value || typeof value !== 'object') return false

  const data = value as Record<string, unknown>
  const options = productOptions[brand]

  const productType =
  typeof data.productType === 'string'
    ? getProductType(data.productType)
    : undefined

  return (
    typeof data.title === 'string' &&
    data.title.length <= 150 &&

    typeof data.slug === 'string' &&
    (data.slug === '' ||
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)) &&
    data.slug.length <= 180 &&

    typeof data.description === 'string' &&
    data.description.length <= 5000 &&

    typeof data.price === 'number' &&
      Number.isFinite(data.price) &&
      data.price >= 0 &&
      Math.abs(data.price * 100 - Math.round(data.price * 100)) < 0.000001 &&

    Array.isArray(data.sizes) &&
      data.sizes.every(
        (size) =>
          typeof size === 'string' &&
          productType?.sizes.includes(size)
      ) &&

    typeof data.category === 'string' &&
    (data.category === '' ||
      options.categories.some(
        (item) => item.id === data.category
      )) &&

    Array.isArray(data.collections) &&
    data.collections.every(
      (id) =>
        typeof id === 'string' &&
        options.collections.some((item) => item.id === id)
    ) &&

    Boolean(productType) &&

    Array.isArray(data.colors) &&
    data.colors.length > 0 &&
    data.colors.every(
      (color) =>
        typeof color === 'string' &&
        productType?.colors.some(
          (available) => available.id === color
        )
    ) &&

    (data.status === 'draft' || data.status === 'ready')
  )
}

export async function saveProductMetadata(brand: BrandId, id: string, metadata: ProductMetadata) {
  const filePath = path.join(
    getArtworkDirectory(brand, id),
    'metadata.json'
  )

  await writeFile(
    filePath,
    JSON.stringify(metadata, null, 2),
    'utf8'
  )
}

export async function isSlugTaken(
  brand: BrandId,
  slug: string,
  excludeArtworkId?: string
): Promise<boolean> {
  if (!slug) return false

  const brandDirectory = path.dirname(
    getArtworkDirectory(
      brand,
      '00000000-0000-4000-8000-000000000000'
    )
  )

  let entries

  try {
    entries = await readdir(brandDirectory, {
      withFileTypes: true,
    })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false
    }

    throw error
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    if (!isArtworkId(entry.name)) continue
    if (entry.name === excludeArtworkId) continue

    const metadata = await getProductMetadata(brand, entry.name)

    if (metadata.slug === slug) {
      return true
    }
  }

  return false
}
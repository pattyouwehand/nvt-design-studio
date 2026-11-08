import 'server-only'

import path from 'node:path'
import { readdir, readFile, stat } from 'node:fs/promises'
import { brands, type BrandId } from '@/lib/brands'
import { getProductMetadata } from '@/lib/productMetadata'
import type { ProductMetadata } from '@/lib/productMetadataTypes'
import { getProductType } from '@/lib/catalog/products'

export interface Artwork {
  id: string
  brand: BrandId
  filename: string
  createdAt: string
  hasMockup: boolean
  metadata: ProductMetadata
  mockupColor: string | null
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isArtworkId(id: string) {
  return UUID_REGEX.test(id)
}

export function getArtworkDirectory(
  brand: BrandId,
  id: string
) {
  if (!isArtworkId(id)) {
    throw new Error('Invalid artwork ID')
  }

  return path.join(
    process.cwd(),
    'designs',
    brand,
    id
  )
}


async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath)
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false
    }

    throw error
  }
}

async function findArtworkMockup(directory: string, metadata: ProductMetadata): Promise<string | null> {
  const product = getProductType(metadata.productType)

  if (!product) return null

  for (const color of metadata.colors) {
    if (!product.colors.some((item) => item.id === color)) {
      continue
    }

    const filename = `${product.id}-${color}-front.webp`

    if (
      await fileExists(
        path.join(directory, 'mockups', filename)
      )
    ) {
      return color
    }
  }

  // Support older black shirt mockups.
  if (
    product.id === 'classic-tee' &&
    metadata.colors.includes('black') &&
    await fileExists(path.join(directory, 'shirt.webp'))
  ) {
    return 'black'
  }

  return null
}

export async function getArtworks(): Promise<Artwork[]> {
  const artworks: Artwork[] = []

  for (const brand of brands) {
    const brandDir = path.join(
      process.cwd(),
      'designs',
      brand.id
    )

    let entries

    try {
      entries = await readdir(brandDir, {
        withFileTypes: true,
      })
    } catch (error) {
      if (
        (error as NodeJS.ErrnoException).code === 'ENOENT'
      ) {
        continue
      }

      throw error
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || !isArtworkId(entry.name)) {
        continue
      }

      const directory = getArtworkDirectory(
        brand.id,
        entry.name
      )

      try {
        const artworkStat = await stat(
          path.join(directory, 'artwork.png')
        )

        const metadata = await getProductMetadata(
          brand.id,
          entry.name
        )

        const mockupColor = await findArtworkMockup(
          directory,
          metadata
        )

        const hasMockup = mockupColor !== null

        artworks.push({
          id: entry.name,
          brand: brand.id,
          filename: 'artwork.png',
          createdAt: artworkStat.birthtime.toISOString(),
          hasMockup,
          mockupColor,
          metadata
        })
      } catch (error) {
        if (
          (error as NodeJS.ErrnoException).code !== 'ENOENT'
        ) {
          throw error
        }
      }
    }
  }

  return artworks.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime()
  )
}
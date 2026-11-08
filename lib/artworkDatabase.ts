import 'server-only'
import { prisma } from '@/lib/prisma'
import { isBrandId } from '@/lib/brands'
import { defaultProductMetadata, type ProductMetadata } from '@/lib/productMetadataTypes'
import { getProductType } from '@/lib/catalog/products'
import type { Artwork } from '@/lib/artworks'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { BrandId } from '@/lib/brands'
import type { Prisma } from '@/lib/generated/prisma/client'

export async function listArtworks(): Promise<Artwork[]> {
  const records = await prisma.artwork.findMany({
    orderBy: {
      createdAt: 'desc'
    }
  })

  return Promise.all(
    records
      .filter((record) => isBrandId(record.brand))
      .map(async (record): Promise<Artwork> => {
        const metadata = {
          ...defaultProductMetadata,
          ...(record.metadata as Partial<ProductMetadata>)
        }

        const product = getProductType(metadata.productType)

        let mockupColor: string | null = null

        if (product) {
          const folder = `${record.brand}/${record.id}/mockups`

          const { data: files, error } = await supabaseAdmin.storage
            .from('artworks')
            .list(folder, { limit: 100 })

          if (error) {
            throw error
          }

          for (const color of metadata.colors) {
            if (!product.colors.some((item) => item.id === color)) {
              continue
            }

            const filename = `${product.id}-${color}-front.webp`

            if (files.some((file) => file.name === filename)) {
              mockupColor = color
              break
            }
          }
        }

        return {
          id: record.id,
          brand: record.brand as Artwork['brand'],
          filename: record.filename,
          createdAt: record.createdAt.toISOString(),
          hasMockup: mockupColor !== null,
          metadata,
          mockupColor
        }
      })
  )
}

export async function getArtworkById(
  brand: BrandId,
  id: string
): Promise<Artwork | null> {
  const record = await prisma.artwork.findUnique({
    where: { id }
  })

  if (!record || record.brand !== brand) {
    return null
  }

  const metadata: ProductMetadata = {
    ...defaultProductMetadata,
    ...(record.metadata as Partial<ProductMetadata>)
  }

  const product = getProductType(metadata.productType)

  let mockupColor: string | null = null

  if (product) {
    const folder = `${brand}/${id}/mockups`

    const { data: files, error } = await supabaseAdmin.storage
      .from('artworks')
      .list(folder, { limit: 100 })

    if (error) {
      throw error
    }

    for (const color of metadata.colors) {
      if (!product.colors.some((item) => item.id === color)) {
        continue
      }

      const filename = `${product.id}-${color}-front.webp`

      if (files.some((file) => file.name === filename)) {
        mockupColor = color
        break
      }
    }
  }

  return {
    id: record.id,
    brand,
    filename: record.filename,
    createdAt: record.createdAt.toISOString(),
    hasMockup: mockupColor !== null,
    metadata,
    mockupColor
  }
}

export async function updateArtworkMetadata(
  brand: BrandId,
  id: string,
  metadata: ProductMetadata
): Promise<boolean> {
  const result = await prisma.artwork.updateMany({
    where: {
      id,
      brand
    },
    data: {
      metadata: metadata as unknown as Prisma.InputJsonValue
    }
  })

  return result.count > 0
}

export async function isArtworkSlugTaken(
  brand: BrandId,
  slug: string,
  excludeId: string
): Promise<boolean> {
  const records = await prisma.artwork.findMany({
    where: {
      brand,
      id: { not: excludeId }
    },
    select: {
      metadata: true
    }
  })

  return records.some((record) => {
    const metadata = record.metadata as Partial<ProductMetadata> | null
    return metadata?.slug === slug
  })
}
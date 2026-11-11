import 'server-only'
import { prisma } from '@/lib/prisma'
import { isBrandId, type BrandId } from '@/lib/brands'
import {
  defaultProductMetadata,
  type ProductMetadata
} from '@/lib/productMetadataTypes'
import { getProductType } from '@/lib/catalog/products'
import type { Artwork } from '@/lib/artworks'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { Prisma } from '@/lib/generated/prisma/client'

function getStoredMetadata(value: Prisma.JsonValue): ProductMetadata {
  return {
    ...defaultProductMetadata,
    ...(value as Partial<ProductMetadata>)
  }
}

function getProductMetadata(
  stored: ProductMetadata,
  product: {
    title: string
    slug: string
    subtitle: string | null
    description: string | null
    price: number | null
    sizes: Prisma.JsonValue
    colors: Prisma.JsonValue
    category: string
    label: string
    collections: Prisma.JsonValue
    status: string
    productType: string
  } | null
): ProductMetadata {
  if (!product) return stored

  return {
    ...stored,
    title: product.title,
    slug: product.slug,
    subtitle: product.subtitle ?? '',
    description: product.description ?? '',
    price: product.price ?? 0,
    sizes: Array.isArray(product.sizes)
      ? product.sizes as string[]
      : [],
    colors: Array.isArray(product.colors)
      ? product.colors as string[]
      : [],
    category: product.category,
    label: product.label,
    collections: Array.isArray(product.collections)
      ? product.collections as string[]
      : [],
    status: product.status === 'ready' ? 'ready' : 'draft',
    productType: product.productType
  }
}

async function findMockupColor(
  brand: BrandId,
  id: string,
  metadata: ProductMetadata
): Promise<string | null> {
  const product = getProductType(metadata.productType)

  if (!product) return null

  const folder = `${brand}/${id}/mockups`

  const { data: files, error } = await supabaseAdmin.storage
    .from('artworks')
    .list(folder, { limit: 100 })

  if (error) throw error

  for (const color of metadata.colors) {
    if (!product.colors.some((item) => item.id === color)) {
      continue
    }

    const filename = `${product.id}-${color}-front.webp`

    if (files.some((file) => file.name === filename)) {
      return color
    }
  }

  return null
}

export async function listArtworks(): Promise<Artwork[]> {
  const records = await prisma.artwork.findMany({
    include: {
      products: {
        orderBy: { createdAt: 'asc' },
        take: 1
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return Promise.all(
    records
      .filter((record) => isBrandId(record.brand))
      .map(async (record): Promise<Artwork> => {
        const stored = getStoredMetadata(record.metadata)
        const metadata = getProductMetadata(
          stored,
          record.products[0] ?? null
        )

        const mockupColor = await findMockupColor(
          record.brand as BrandId,
          record.id,
          metadata
        )

        return {
          id: record.id,
          brand: record.brand as BrandId,
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
    where: { id },
    include: {
      products: {
        orderBy: { createdAt: 'asc' },
        take: 1
      }
    }
  })

  if (!record || record.brand !== brand) {
    return null
  }

  const metadata = getProductMetadata(
    getStoredMetadata(record.metadata),
    record.products[0] ?? null
  )

  const mockupColor = await findMockupColor(
    brand,
    id,
    metadata
  )

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

export async function getArtworkLinkedProducts(
  brand: BrandId,
  artworkId: string
) {
  return prisma.product.findMany({
    where: {
      artworkId,
      brand
    },
    select: {
      id: true,
      title: true,
      slug: true,
      productType: true,
      status: true,
      createdAt: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  })
}

export async function updateArtworkMetadata(
  brand: BrandId,
  id: string,
  metadata: ProductMetadata,
  productId?: string
): Promise<boolean> {
  const artwork = await prisma.artwork.findFirst({
    where: { id, brand },
    select: { id: true }
  })

  if (!artwork) return false

  const existingProduct = productId
    ? await prisma.product.findFirst({
        where: {
          id: productId,
          artworkId: id,
          brand
        }
      })
    : await prisma.product.findFirst({
        where: {
          artworkId: id,
          brand
        },
        orderBy: { createdAt: 'asc' }
      })

  // Never create a replacement when an explicit product ID is invalid.
  if (productId && !existingProduct) {
    throw new Error('Product not found for this artwork.')
  }

  await prisma.$transaction(async (tx) => {
    const productData = {
      brand,
      productType: metadata.productType,
      title: metadata.title,
      slug: metadata.slug,
      subtitle: metadata.subtitle,
      description: metadata.description,
      price: metadata.price,
      status: metadata.status,
      sizes: metadata.sizes,
      colors: metadata.colors,
      category: metadata.category,
      label: metadata.label,
      collections: metadata.collections,
      metadata: metadata as unknown as Prisma.InputJsonValue
    }

    if (existingProduct) {
      await tx.product.update({
        where: { id: existingProduct.id },
        data: productData
      })
    } else if (metadata.title.trim() && metadata.slug.trim()) {
      await tx.product.create({
        data: {
          ...productData,
          artworkId: id
        }
      })
    }

    // Keep legacy artwork metadata only for the original product.
    const firstProduct = await tx.product.findFirst({
      where: { artworkId: id, brand },
      orderBy: { createdAt: 'asc' },
      select: { id: true }
    })

    if (!firstProduct || firstProduct.id === existingProduct?.id || !productId) {
      await tx.artwork.update({
        where: { id },
        data: {
          metadata: metadata as unknown as Prisma.InputJsonValue
        }
      })
    }
  })

  return true
}

export async function isArtworkSlugTaken(
  brand: BrandId,
  slug: string,
  excludeId: string
): Promise<boolean> {
  const existing = await prisma.product.findFirst({
    where: {
      brand,
      slug,
      artworkId: { not: excludeId }
    },
    select: { id: true }
  })

  if (existing) return true

  // Also check legacy artworks without migrated products.
  const records = await prisma.artwork.findMany({
    where: {
      brand,
      id: { not: excludeId },
      products: { none: {} }
    },
    select: { metadata: true }
  })

  return records.some((record) => {
    const metadata = record.metadata as Partial<ProductMetadata>
    return metadata?.slug === slug
  })
}

export async function deleteArtwork(
  brand: BrandId,
  id: string
): Promise<boolean> {
  const linkedProducts = await prisma.product.count({
    where: { artworkId: id, brand }
  })

  if (linkedProducts > 0) {
    return false
  }

  const result = await prisma.artwork.deleteMany({
    where: { id, brand }
  })

  return result.count > 0
}
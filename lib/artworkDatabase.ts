import 'server-only'
import { prisma } from '@/lib/prisma'
import { isBrandId, type BrandId } from '@/lib/brands'
import { defaultProductMetadata, type ProductMetadata } from '@/lib/productMetadataTypes'
import type { Artwork } from '@/lib/artworks'

// Compatibility for older callers. Product fields are never stored on Artwork.
export async function listArtworks(): Promise<Artwork[]> {
  const records = await prisma.artwork.findMany({ orderBy: { createdAt: 'desc' } })
  return records.filter((item) => isBrandId(item.brand)).map((item) => ({
    id: item.id, brand: item.brand as BrandId, filename: item.filename,
    createdAt: item.createdAt.toISOString(), hasMockup: false,
    mockupColor: null, metadata: { ...defaultProductMetadata }
  }))
}

export async function getArtworkById(brand: BrandId, id: string): Promise<Artwork | null> {
  const item = await prisma.artwork.findFirst({ where: { id, brand } })
  return item ? {
    id: item.id, brand, filename: item.filename,
    createdAt: item.createdAt.toISOString(), hasMockup: false,
    mockupColor: null, metadata: { ...defaultProductMetadata }
  } : null
}

export async function getArtworkLinkedProducts(brand: BrandId, artworkId: string) {
  return prisma.product.findMany({
    where: { brand, artworkId },
    select: { id: true, title: true, slug: true, productType: true, status: true, createdAt: true },
    orderBy: { createdAt: 'desc' }
  })
}

// Legacy endpoint compatibility: edits must go through /api/products/[id].
export async function updateArtworkMetadata(
  _brand: BrandId, _id: string, _metadata: ProductMetadata, _productId?: string
): Promise<boolean> {
  throw new Error('Legacy artwork metadata editing is disabled. Edit the product instead.')
}

export async function isArtworkSlugTaken(brand: BrandId, slug: string, excludeId: string) {
  const product = await prisma.product.findFirst({
    where: { brand, slug, artworkId: { not: excludeId } }, select: { id: true }
  })
  return Boolean(product)
}

export async function deleteArtwork(brand: BrandId, id: string): Promise<boolean> {
  if (await prisma.product.count({ where: { brand, artworkId: id } })) return false
  const result = await prisma.artwork.deleteMany({ where: { brand, id } })
  return result.count > 0
}

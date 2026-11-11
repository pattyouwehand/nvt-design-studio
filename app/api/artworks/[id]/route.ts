import { NextRequest, NextResponse } from 'next/server'
import { isBrandId } from '@/lib/brands'
import { isArtworkId } from '@/lib/artworks'
import { getStudioUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deleteArtworkFiles } from '@/lib/artworkStorage'

export const runtime = 'nodejs'
type Context = { params: Promise<{ id: string }> }

async function identify(request: NextRequest, context: Context) {
  const { id } = await context.params
  const brand = request.nextUrl.searchParams.get('brand')

  return brand && isBrandId(brand) && isArtworkId(id) ? { id, brand } : null
}

export async function GET(request: NextRequest, context: Context) {
  if (!(await getStudioUser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const identity = await identify(request, context)
  if (!identity) return NextResponse.json({ error: 'Invalid artwork' }, { status: 400 })
  const artwork = await prisma.artwork.findFirst({ where: identity })
  if (!artwork) return NextResponse.json({ error: 'Artwork not found' }, { status: 404 })
  const [products, published] = await Promise.all([
    prisma.product.findMany({
      where: { artworkId: identity.id, brand: identity.brand },
      select: { id: true, title: true, slug: true, productType: true, status: true, createdAt: true },
      orderBy: { createdAt: 'asc' }
    }),
    prisma.publishedProduct.findMany({
      where: { brand: identity.brand }, select: { productId: true }
    })
  ])
  const publishedIds = new Set(published.map((item) => item.productId))
  return NextResponse.json({
    id: artwork.id, brand: artwork.brand, filename: artwork.filename,
    createdAt: artwork.createdAt.toISOString(),
    linkedProducts: products.map((product) => ({ ...product, isPublished: publishedIds.has(product.id) }))
  })
}

export async function PUT() {
  return NextResponse.json({ error: 'Artwork metadata editing has moved to the Product Editor.' }, { status: 410 })
}

export async function DELETE(request: NextRequest, context: Context) {
  if (!(await getStudioUser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const identity = await identify(request, context)
  if (!identity) return NextResponse.json({ error: 'Invalid artwork' }, { status: 400 })
  if (await prisma.product.count({ where: { artworkId: identity.id, brand: identity.brand } })) {
    return NextResponse.json({ error: 'Delete linked products first.' }, { status: 409 })
  }
  const result = await prisma.artwork.deleteMany({ where: identity })
  if (!result.count) return NextResponse.json({ error: 'Artwork not found' }, { status: 404 })
  try { await deleteArtworkFiles(identity.brand, identity.id) }
  catch (error) { console.error('Artwork deleted; storage cleanup failed:', error); return NextResponse.json({ success: true, warning: 'Storage cleanup failed.' }) }
  return NextResponse.json({ success: true })
}

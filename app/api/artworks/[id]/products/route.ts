import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { getStudioUser } from '@/lib/auth'
import { isBrandId } from '@/lib/brands'
import { isArtworkId } from '@/lib/artworks'
import { getProductType } from '@/lib/catalog/products'

export const runtime = 'nodejs'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await getStudioUser()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const brand = request.nextUrl.searchParams.get('brand')
  if (!brand || !isBrandId(brand) || !isArtworkId(id)) return NextResponse.json({ error: 'Invalid artwork.' }, { status: 400 })
  try {
    const artwork = await prisma.artwork.findFirst({ where: { id, brand }, select: { id: true } })
    if (!artwork) return NextResponse.json({ error: 'Artwork not found.' }, { status: 404 })
    const body: unknown = await request.json()
    const typeId = body && typeof body === 'object' && 'productType' in body ? body.productType : null
    const productType = typeof typeId === 'string' ? getProductType(typeId) : undefined
    if (!productType) return NextResponse.json({ error: 'Invalid product type.' }, { status: 400 })
    const productId = randomUUID()
    const product = await prisma.product.create({
      data: {
        id: productId, artworkId: id, brand, productType: productType.id,
        title: '', slug: `draft-${productId}`, status: 'draft',
        subtitle: '', description: '', price: null,
        sizes: [], colors: [], category: '', label: '', collections: []
      },
      select: { id: true }
    })
    return NextResponse.json({ success: true, productId: product.id }, { status: 201 })
  } catch (error) {
    console.error('Unable to create product:', error)
    return NextResponse.json({ error: 'Unable to create product.' }, { status: 500 })
  }
}

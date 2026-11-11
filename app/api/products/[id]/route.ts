import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getStudioUser } from '@/lib/auth'
import { isArtworkId } from '@/lib/artworks'
import { isBrandId } from '@/lib/brands'
import { validateProductMetadata } from '@/lib/productMetadata'
import { Prisma } from '@/lib/generated/prisma/client'

export const runtime = 'nodejs'
type Context = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Context) {
  if (!(await getStudioUser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  if (!isArtworkId(id)) return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 })
  const [product, published] = await Promise.all([
    prisma.product.findUnique({ where: { id }, include: { artwork: { select: { brand: true } } } }),
    prisma.publishedProduct.findUnique({ where: { productId: id }, select: { id: true } })
  ])
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  return NextResponse.json({ product: { ...product, isPublished: Boolean(published) } })
}

export async function PATCH(request: NextRequest, { params }: Context) {
  if (!(await getStudioUser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  if (!isArtworkId(id)) return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 })
  const current = await prisma.product.findUnique({ where: { id }, select: { id: true, brand: true, artworkId: true } })
  if (!current || !isBrandId(current.brand)) return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  let input: unknown
  try { input = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  if (!validateProductMetadata(current.brand, input)) return NextResponse.json({ error: 'Invalid product details' }, { status: 400 })
  if (!input.slug.trim()) return NextResponse.json({ error: 'A slug is required' }, { status: 400 })
  try {
    const product = await prisma.product.update({
      where: { id },
      data: {
        title: input.title, slug: input.slug, subtitle: input.subtitle,
        description: input.description, price: input.price, sizes: input.sizes,
        colors: input.colors, category: input.category, collections: input.collections,
        label: input.label, status: input.status, productType: input.productType,
        metadata: Prisma.DbNull
      }
    })
    return NextResponse.json({ product })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'This slug is already in use for this brand' }, { status: 409 })
    }
    console.error('Unable to update product', error)
    return NextResponse.json({ error: 'Unable to save product' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  if (!(await getStudioUser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  if (!isArtworkId(id)) return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 })
  const product = await prisma.product.findUnique({ where: { id }, select: { artworkId: true } })
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  await prisma.$transaction(async (tx) => {
    await tx.publishedProduct.deleteMany({ where: { productId: id } })
    await tx.product.delete({ where: { id } })
  })
  return NextResponse.json({ success: true, artworkId: product.artworkId })
}

import { NextRequest, NextResponse } from 'next/server'
import { getStudioUser } from '@/lib/auth'
import { isBrandId } from '@/lib/brands'
import { isArtworkId } from '@/lib/artworks'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  if (!(await getStudioUser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const brand = request.nextUrl.searchParams.get('brand')
  const slug = request.nextUrl.searchParams.get('slug')
  const productId = request.nextUrl.searchParams.get('productId')
  if (!brand || !isBrandId(brand) || !slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || (productId !== null && !isArtworkId(productId))) {
    return NextResponse.json({ error: 'Invalid slug check parameters' }, { status: 400 })
  }
  const existing = await prisma.product.findFirst({ where: { brand, slug, ...(productId ? { id: { not: productId } } : {}) }, select: { id: true } })
  return NextResponse.json({ available: !existing })
}

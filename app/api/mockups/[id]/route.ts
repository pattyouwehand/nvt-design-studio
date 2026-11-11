import { NextRequest, NextResponse } from 'next/server'
import { isBrandId } from '@/lib/brands'
import { isArtworkId } from '@/lib/artworks'
import { getProductType } from '@/lib/catalog/products'
import { getArtworkMockup } from '@/lib/artworkStorage'
import { getStudioUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
type Context = { params: Promise<{ id: string }> }
async function serve(request: NextRequest, { params }: Context, head: boolean) {
  if (!(await getStudioUser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const brand = request.nextUrl.searchParams.get('brand')
  const type = request.nextUrl.searchParams.get('productType') ?? 'classic-tee'
  const color = request.nextUrl.searchParams.get('color') ?? 'black'
  const product = getProductType(type)
  if (!brand || !isBrandId(brand) || !isArtworkId(id) || !product?.colors.some((item) => item.id === color)) {
    return NextResponse.json({ error: 'Invalid mockup parameters' }, { status: 400 })
  }
  const exists = await prisma.artwork.findFirst({ where: { id, brand }, select: { id: true } })
  if (!exists) return NextResponse.json({ error: 'Artwork not found' }, { status: 404 })
  try {
    const buffer = await getArtworkMockup(brand, id, `${type}-${color}-front.webp`)
    return new NextResponse(head ? null : new Uint8Array(buffer), { status: 200, headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Mockup not found' }, { status: 404 })
  }
}
export async function GET(request: NextRequest, context: Context) { return serve(request, context, false) }
export async function HEAD(request: NextRequest, context: Context) { return serve(request, context, true) }

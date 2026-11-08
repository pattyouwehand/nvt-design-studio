import { NextRequest, NextResponse } from 'next/server'
import { isBrandId } from '@/lib/brands'
import { isArtworkId } from '@/lib/artworks'
import { getProductType } from '@/lib/catalog/products'
import { getArtworkMockup } from '@/lib/artworkStorage'
import { getStudioUser } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getStudioUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const brand = request.nextUrl.searchParams.get('brand')
  const productType = request.nextUrl.searchParams.get('productType') ?? 'classic-tee'
  const color = request.nextUrl.searchParams.get('color') ?? 'black'

  if (!brand || !isBrandId(brand) || !isArtworkId(id)) {
    return NextResponse.json(
      { error: 'Invalid artwork.' },
      { status: 400 }
    )
  }

  const product = getProductType(productType)

  if (
    !product ||
    !product.colors.some((item) => item.id === color)
  ) {
    return NextResponse.json(
      { error: 'Invalid product type or color.' },
      { status: 400 }
    )
  }

  const filename = `${productType}-${color}-front.webp`

  try {
    const image = await getArtworkMockup(
      brand,
      id,
      filename
    )

    return new NextResponse(new Uint8Array(image), {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'no-store'
      }
    })
  } catch (error) {
    console.error('Unable to load mockup:', error)

    return NextResponse.json(
      { error: 'Unable to load mockup.' },
      { status: 500 }
    )
  }
}
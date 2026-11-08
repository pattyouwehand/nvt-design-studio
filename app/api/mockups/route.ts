import { NextRequest, NextResponse } from 'next/server'
import { generateMockup } from '@/lib/mockup/generateMockup'
import { getProductType } from '@/lib/catalog/products'
import { isBrandId } from '@/lib/brands'
import { isArtworkId } from '@/lib/artworks'
import { getStudioUser } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const user = await getStudioUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
  try {
    const body = await request.json()

    const {
      brand,
      id,
      productType = 'classic-tee',
      color = 'black',
    } = body

    if (
      typeof brand !== 'string' ||
      !isBrandId(brand) ||
      typeof id !== 'string' ||
      !isArtworkId(id)
    ) {
      return NextResponse.json(
        { error: 'Invalid brand or artwork ID.' },
        { status: 400 }
      )
    }

    const product = typeof productType === 'string'
      ? getProductType(productType)
      : undefined

    if (
      !product ||
      typeof color !== 'string' ||
      !product.colors.some((item) => item.id === color)
    ) {
      return NextResponse.json(
        { error: 'Invalid product type or color.' },
        { status: 400 }
      )
    }

    const result = await generateMockup(
      brand,
      id,
      productType,
      color
    )

    return NextResponse.json({
      success: true,
      filename: result.filename,
      productType: result.productType,
      color: result.color
    })
  } catch (error) {
    console.error('Mockup generation failed:', error)

    return NextResponse.json(
      { error: 'Unable to generate mockup.' },
      { status: 500 }
    )
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { getStudioUser } from '@/lib/auth'
import { isBrandId } from '@/lib/brands'
import { isArtworkId } from '@/lib/artworks'
import { defaultProductMetadata } from '@/lib/productMetadataTypes'
import type { Prisma } from '@/lib/generated/prisma/client'

export const runtime = 'nodejs'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getStudioUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const { id } = await params
  const brand = request.nextUrl.searchParams.get('brand')

  if (!brand || !isBrandId(brand) || !isArtworkId(id)) {
    return NextResponse.json(
      { error: 'Invalid artwork.' },
      { status: 400 }
    )
  }

  try {
    const artwork = await prisma.artwork.findFirst({
      where: { id, brand },
      select: { id: true }
    })

    if (!artwork) {
      return NextResponse.json(
        { error: 'Artwork not found.' },
        { status: 404 }
      )
    }

    const body: unknown = await request.json()

    if (
      !body ||
      typeof body !== 'object' ||
      !('productType' in body) ||
      typeof body.productType !== 'string' ||
      !body.productType.trim()
    ) {
      return NextResponse.json(
        { error: 'Select a product type.' },
        { status: 400 }
      )
    }

    const productType = body.productType
    const productId = randomUUID()
    const slug = `draft-${productId}`

    const metadata = {
      ...defaultProductMetadata,
      productType,
      slug,
      status: 'draft' as const
    }

    const product = await prisma.product.create({
      data: {
        id: productId,
        artworkId: id,
        brand,
        productType,
        title: '',
        slug,
        status: 'draft',
        subtitle: '',
        description: '',
        price: null,
        sizes: [],
        colors: ['black'],
        category: '',
        label: '',
        collections: [],
        metadata: metadata as unknown as Prisma.InputJsonValue
      },
      select: {
        id: true
      }
    })

    return NextResponse.json(
      {
        success: true,
        productId: product.id
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Unable to create product:', error)

    return NextResponse.json(
      { error: 'Unable to create product.' },
      { status: 500 }
    )
  }
}
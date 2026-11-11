import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getStudioUser } from '@/lib/auth'
import { isArtworkId } from '@/lib/artworks'
import { defaultProductMetadata } from '@/lib/productMetadataTypes'
import type { Prisma } from '@/lib/generated/prisma/client'

export const runtime = 'nodejs'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getStudioUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const { id } = await params

  if (!isArtworkId(id)) {
    return NextResponse.json(
      { error: 'Invalid product ID.' },
      { status: 400 }
    )
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { artwork: true }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found.' },
        { status: 404 }
      )
    }

    await prisma.$transaction(async (tx) => {
      // Remove the storefront publication, if present.
      await tx.publishedProduct.deleteMany({
        where: { productId: id }
      })

      // ProductSharedImage links are deleted automatically
      // through the Prisma cascade relation.
      await tx.product.delete({
        where: { id }
      })

      // Reset legacy metadata only when this artwork has
      // no other products.
      const remainingProducts = await tx.product.count({
        where: { artworkId: product.artworkId }
      })

      if (remainingProducts === 0) {
        await tx.artwork.update({
          where: { id: product.artworkId },
          data: {
            metadata: defaultProductMetadata as unknown as Prisma.InputJsonValue
          }
        })
      }
    })

    return NextResponse.json({
      success: true,
      artworkId: product.artworkId
    })
  } catch (error) {
    console.error('Product deletion failed:', error)

    return NextResponse.json(
      { error: 'Unable to delete product.' },
      { status: 500 }
    )
  }
}
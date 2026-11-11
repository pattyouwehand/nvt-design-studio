import { NextRequest, NextResponse } from 'next/server'
import { isBrandId } from '@/lib/brands'
import { isArtworkId } from '@/lib/artworks'
import { getArtworkById, updateArtworkMetadata, isArtworkSlugTaken, deleteArtwork } from '@/lib/artworkDatabase'
import { validateProductMetadata } from '@/lib/productMetadata'
import { getStudioUser } from '@/lib/auth'
import { deleteArtworkFiles } from '@/lib/artworkStorage'
import { prisma } from '@/lib/prisma'
import { defaultProductMetadata } from '@/lib/productMetadataTypes'

export const runtime = 'nodejs'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const brand = request.nextUrl.searchParams.get('brand')
  const selectedProductId = request.nextUrl.searchParams.get('productId')
  const user = await getStudioUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  if (!brand || !isBrandId(brand) || !isArtworkId(id)) {
    return NextResponse.json(
      { error: 'Invalid artwork.' },
      { status: 400 }
    )
  }

  try {
    const artwork = await getArtworkById(brand, id)

    if (!artwork) {
      return NextResponse.json(
        { error: 'Artwork not found.' },
        { status: 404 }
      )
    }

    // Fetch every product linked to this artwork.
    const linkedProducts = await prisma.product.findMany({
      where: {
        artworkId: id,
        brand
      },
      select: {
        id: true,
        title: true,
        slug: true,
        productType: true,
        status: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    // Fetch published product IDs in one query.
    const publishedProducts = linkedProducts.length
      ? await prisma.publishedProduct.findMany({
          where: {
            productId: {
              in: linkedProducts.map((product) => product.id)
            }
          },
          select: {
            productId: true
          }
        })
      : []

    const publishedIds = new Set(
      publishedProducts.map((product) => product.productId)
    )

    const products = linkedProducts.map((product) => ({
      ...product,
      isPublished: publishedIds.has(product.id)
    }))

    const selectedProduct = selectedProductId ? products.find((product) => product.id === selectedProductId) : products[0]

    if (selectedProductId && !selectedProduct) {
      return NextResponse.json(
        { error: 'Product not found for this artwork.' },
        { status: 404 }
      )
    }

    const selectedProductRecord = selectedProduct
      ? await prisma.product.findUnique({
          where: { id: selectedProduct.id }
        })
      : null

    const selectedMetadata = selectedProductRecord
      ? {
          ...defaultProductMetadata,
          title: selectedProductRecord.title,
          slug: selectedProductRecord.slug,
          subtitle: selectedProductRecord.subtitle ?? '',
          description: selectedProductRecord.description ?? '',
          price: selectedProductRecord.price ?? 0,
          sizes: selectedProductRecord.sizes,
          colors: selectedProductRecord.colors,
          category: selectedProductRecord.category,
          label: selectedProductRecord.label,
          collections: selectedProductRecord.collections,
          status: selectedProductRecord.status,
          productType: selectedProductRecord.productType
        }
      : artwork.metadata

    return NextResponse.json({
      ...artwork,
      metadata: selectedMetadata,
      productId: selectedProduct?.id ?? null,
      isPublished: selectedProduct?.isPublished ?? false,
      linkedProducts: products,
      width: null,
      height: null
    })
  } catch (error) {
    console.error('Unable to load artwork:', error)

    return NextResponse.json(
      { error: 'Unable to load artwork.' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const brand = request.nextUrl.searchParams.get('brand')
  const productId = request.nextUrl.searchParams.get('productId')
  const user = await getStudioUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  if (!brand || !isBrandId(brand) || !isArtworkId(id)) {
    return NextResponse.json(
      { error: 'Invalid artwork.' },
      { status: 400 }
    )
  }

  try {
    const metadata: unknown = await request.json()

    if (!validateProductMetadata(brand, metadata)) {
      return NextResponse.json(
        { error: 'Invalid product details.' },
        { status: 400 }
      )
    }

    // When editing an existing product, require its ID.
    const existingProducts = await prisma.product.findMany({
      where: { artworkId: id, brand },
      select: { id: true }
    })

    if (existingProducts.length > 0 && !productId) {
      return NextResponse.json(
        { error: 'Select a product before saving.' },
        { status: 400 }
      )
    }

    if (
      productId &&
      !existingProducts.some((product) => product.id === productId)
    ) {
      return NextResponse.json(
        { error: 'Product not found for this artwork.' },
        { status: 404 }
      )
    }

    // Check slug conflicts, excluding the selected product.
    if (metadata.slug) {
      const slugConflict = await prisma.product.findFirst({
        where: {
          brand,
          slug: metadata.slug,
          ...(productId ? { id: { not: productId } } : {})
        },
        select: { id: true }
      })

      if (slugConflict) {
        return NextResponse.json(
          { error: 'This URL slug is already in use for this brand.' },
          { status: 409 }
        )
      }
    }

    const updated = await updateArtworkMetadata(
      brand,
      id,
      metadata,
      productId ?? undefined
    )

    if (!updated) {
      return NextResponse.json(
        { error: 'Artwork not found.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      metadata
    })
  } catch (error) {
    console.error('Unable to save product details:', error)

    return NextResponse.json(
      { error: 'Unable to save product details.' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
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
  const brand = request.nextUrl.searchParams.get('brand')

  if (!brand || !isBrandId(brand) || !isArtworkId(id)) {
    return NextResponse.json(
      { error: 'Invalid artwork.' },
      { status: 400 }
    )
  }

  try {
    const artwork = await getArtworkById(brand, id)

    if (!artwork) {
      return NextResponse.json(
        { error: 'Artwork not found.' },
        { status: 404 }
      )
    }

    const linkedProducts = await prisma.product.count({
      where: {
        artworkId: id,
        brand
      }
    })

    if (linkedProducts > 0) {
      return NextResponse.json(
        {
          error: 'This artwork is linked to products. Remove those products before deleting the artwork.'
        },
        { status: 409 }
      )
    }

    // Remove database record first.
    const deleted = await deleteArtwork(brand, id)

    if (deleted) {
      // Clean up storage only after the database deletion succeeds.
      await deleteArtworkFiles(brand, id)
    }

    if (!deleted) {
      return NextResponse.json(
        { error: 'Artwork could not be deleted.' },
        { status: 409 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unable to delete artwork:', error)

    return NextResponse.json(
      { error: 'Unable to delete artwork.' },
      { status: 500 }
    )
  }
}
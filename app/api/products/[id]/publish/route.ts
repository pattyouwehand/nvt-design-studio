import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getStudioUser } from '@/lib/auth'
import { getProductType } from '@/lib/catalog/products'
import { getArtworkMockup } from '@/lib/artworkStorage'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { isBrandId } from '@/lib/brands'
import { isArtworkId } from '@/lib/artworks'

export const runtime = 'nodejs'

const PUBLIC_BUCKET = 'product-images'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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

    const brand = product.brand

    if (
      !isBrandId(brand) ||
      product.artwork.brand !== brand
    ) {
      return NextResponse.json(
        { error: 'Invalid product brand.' },
        { status: 400 }
      )
    }

    const productType = getProductType(product.productType)

    if (!productType) {
      return NextResponse.json(
        { error: 'Unknown product type.' },
        { status: 400 }
      )
    }

    const sizes = product.sizes
    const colors = product.colors
    const collections = product.collections

    if (
      product.status !== 'ready' ||
      !product.title.trim() ||
      !product.slug.trim() ||
      product.price === null ||
      !Number.isFinite(product.price) ||
      product.price <= 0 ||
      !Array.isArray(sizes) ||
      sizes.length === 0 ||
      !sizes.every((size) => typeof size === 'string') ||
      !Array.isArray(colors) ||
      colors.length === 0 ||
      !colors.every((color) => typeof color === 'string') ||
      !colors.every((color) =>
        productType.colors.some((item) => item.id === color)
      )
    ) {
      return NextResponse.json(
        { error: 'Complete the product details before publishing.' },
        { status: 400 }
      )
    }

    // Prevent another product from using the same brand/slug.
    const slugConflict = await prisma.publishedProduct.findFirst({
      where: {
        brand,
        slug: product.slug,
        productId: { not: product.id }
      },
      select: { id: true }
    })

    if (slugConflict) {
      return NextResponse.json(
        { error: 'This URL slug is already published for this brand.' },
        { status: 409 }
      )
    }

    const images: Record<string, string> = {}
    const uploadedPaths: string[] = []

    // Upload public mockups before updating the published snapshot.
    for (const color of colors as string[]) {
      const filename = `${productType.id}-${color}-front.webp`

      // Read from the existing private artworks bucket.
      const mockup = await getArtworkMockup(
        brand,
        product.artworkId,
        filename
      )

      // Product ID ensures different clothing types do not collide.
      const storagePath = `${brand}/${product.id}/${filename}`

      const { error: uploadError } = await supabaseAdmin.storage
        .from(PUBLIC_BUCKET)
        .upload(storagePath, mockup, {
          contentType: 'image/webp',
          upsert: true,
          cacheControl: '60'
        })

      if (uploadError) {
        throw uploadError
      }

      uploadedPaths.push(storagePath)

      const { data } = supabaseAdmin.storage
        .from(PUBLIC_BUCKET)
        .getPublicUrl(storagePath)

      // Version query helps browsers refresh updated mockups.
      images[color] = `${data.publicUrl}?v=${Date.now()}`
    }

    const snapshot = {
      id: product.id,
      artworkId: product.artworkId,
      brand,
      productType: product.productType,
      title: product.title,
      slug: product.slug,
      subtitle: product.subtitle,
      description: product.description ?? '',
      price: product.price,
      sizes,
      colors,
      category: product.category,
      collections: Array.isArray(collections) ? collections : [],
      images
    }

    const published = await prisma.publishedProduct.upsert({
      where: { productId: product.id },
      create: {
        productId: product.id,
        brand,
        slug: product.slug,
        data: snapshot
      },
      update: {
        brand,
        slug: product.slug,
        data: snapshot
      }
    })

    return NextResponse.json({
      success: true,
      productId: published.productId,
      publishedAt: published.publishedAt,
      images: uploadedPaths.length
    })
  } catch (error) {
    console.error('Product publishing failed:', error)

    return NextResponse.json(
      {
        error: 'Unable to publish product. Check that all selected colors have generated mockups.'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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
    const published = await prisma.publishedProduct.findUnique({
      where: { productId: id }
    })

    if (!published) {
      return NextResponse.json(
        { error: 'Product is not published.' },
        { status: 404 }
      )
    }

    // Remove the storefront snapshot.
    await prisma.publishedProduct.delete({
      where: { productId: id }
    })

    return NextResponse.json({
      success: true,
      productId: id
    })
  } catch (error) {
    console.error('Unpublish failed:', error)

    return NextResponse.json(
      { error: 'Unable to unpublish product.' },
      { status: 500 }
    )
  }
}
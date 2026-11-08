import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'
import { isBrandId } from '@/lib/brands'
import { isArtworkId } from '@/lib/artworks'
import { validateProductMetadata } from '@/lib/productMetadata'
import { getProductType } from '@/lib/catalog/products'
import { getArtworkById, isArtworkSlugTaken } from '@/lib/artworkDatabase'
import { getArtworkMockup } from '@/lib/artworkStorage'
import { getStudioUser } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const brand = request.nextUrl.searchParams.get('brand')
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

    const metadata = artwork.metadata

    if (!validateProductMetadata(brand, metadata)) {
      return NextResponse.json(
        { error: 'Product details are invalid.' },
        { status: 400 }
      )
    }

    if (metadata.status !== 'ready') {
      return NextResponse.json(
        {
          error: 'Set the product status to Ready for export first.'
        },
        { status: 400 }
      )
    }

    if (await isArtworkSlugTaken(brand, metadata.slug, id)) {
      return NextResponse.json(
        {
          error: 'This URL slug is already in use for this brand.'
        },
        { status: 409 }
      )
    }

    if (
      !metadata.title.trim() ||
      !metadata.slug.trim() ||
      metadata.price <= 0 ||
      metadata.sizes.length === 0 ||
      metadata.colors.length === 0
    ) {
      return NextResponse.json(
        {
          error: 'Complete the product details before exporting.'
        },
        { status: 400 }
      )
    }

    const product = getProductType(metadata.productType)

    if (!product) {
      return NextResponse.json(
        { error: 'Unknown product type.' },
        { status: 400 }
      )
    }

    const zip = new JSZip()
    const images: Record<string, string> = {}

    // Download mockups from Supabase Storage.
    for (const color of metadata.colors) {
      const filename = `${product.id}-${color}-front.webp`

      const image = await getArtworkMockup(
        brand,
        id,
        filename
      )

      const zipPath = `images/${filename}`

      zip.file(zipPath, image)
      images[color] = zipPath
    }

    // Product data for the storefront.
    const exportData = {
      version: 1,
      source: 'nvt-design-studio',
      artworkId: id,
      brand,
      title: metadata.title,
      slug: metadata.slug,
      description: metadata.description,
      price: metadata.price,
      productType: metadata.productType,
      colors: metadata.colors,
      sizes: metadata.sizes,
      category: metadata.category,
      collections: metadata.collections,
      status: 'draft',
      images
    }

    zip.file(
      'product.json',
      JSON.stringify(exportData, null, 2)
    )

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    })

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition':
          `attachment; filename="${brand}-${metadata.slug}.zip"`,
        'Cache-Control': 'no-store'
      }
    })
  } catch (error) {
    console.error('Product export failed:', error)

    return NextResponse.json(
      {
        error:
          'Unable to export product. Check that all selected colors have generated mockups.'
      },
      { status: 500 }
    )
  }
}
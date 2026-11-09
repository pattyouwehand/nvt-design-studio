import { NextRequest, NextResponse } from 'next/server'
import { isBrandId } from '@/lib/brands'
import { isArtworkId } from '@/lib/artworks'
import { getArtworkById, updateArtworkMetadata, isArtworkSlugTaken, deleteArtwork } from '@/lib/artworkDatabase'
import { validateProductMetadata } from '@/lib/productMetadata'
import { getStudioUser } from '@/lib/auth'
import { deleteArtworkFiles } from '@/lib/artworkStorage'

export const runtime = 'nodejs'

export async function GET( request: NextRequest, { params }: { params: Promise<{ id: string }> } ) {
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

    return NextResponse.json({
      ...artwork,
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

    if (
      metadata.slug &&
      await isArtworkSlugTaken(brand, metadata.slug, id)
    ) {
      return NextResponse.json(
        { error: 'This URL slug is already in use for this brand.' },
        { status: 409 }
      )
    }

    const updated = await updateArtworkMetadata(
      brand,
      id,
      metadata
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

    // Remove original artwork and generated mockups
    await deleteArtworkFiles(brand, id)

    // Remove database record
    const deleted = await deleteArtwork(brand, id)

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
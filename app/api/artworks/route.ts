import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { isBrandId } from '@/lib/brands'
import { getStudioUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { uploadArtworkImage } from '@/lib/artworkStorage'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 25 * 1024 * 1024

export async function GET() {
  if (!(await getStudioUser())) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const artworks = await prisma.artwork.findMany({
      include: {
        _count: {
          select: { products: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      artworks: artworks.map((artwork) => ({
        id: artwork.id,
        brand: artwork.brand,
        filename: artwork.filename,
        createdAt: artwork.createdAt.toISOString(),
        updatedAt: artwork.updatedAt.toISOString(),
        productCount: artwork._count.products,
      })),
    })
  } catch (error) {
    console.error('Unable to load artworks:', error)

    return NextResponse.json(
      { error: 'Unable to load artworks.' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  if (!(await getStudioUser())) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const formData = await request.formData()
    const brand = formData.get('brand')
    const file = formData.get('artwork')

    if (
      typeof brand !== 'string' ||
      !isBrandId(brand)
    ) {
      return NextResponse.json(
        { error: 'Invalid brand.' },
        { status: 400 }
      )
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'Please select a PNG file.' },
        { status: 400 }
      )
    }

    if (
      file.size === 0 ||
      file.size > MAX_FILE_SIZE
    ) {
      return NextResponse.json(
        { error: 'File must be smaller than 25 MB.' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(
      await file.arrayBuffer()
    )

    const metadata = await sharp(buffer).metadata()

    if (
      metadata.format !== 'png' ||
      !metadata.width ||
      !metadata.height ||
      metadata.width > 10000 ||
      metadata.height > 10000
    ) {
      return NextResponse.json(
        { error: 'Please upload a valid PNG image.' },
        { status: 400 }
      )
    }

    const id = randomUUID()

    await uploadArtworkImage(brand, id, buffer)

    try {
      const artwork = await prisma.artwork.create({
        data: {
          id,
          brand,
          filename: file.name,
        },
      })

      return NextResponse.json(
        {
          success: true,
          artwork: {
            id: artwork.id,
            brand: artwork.brand,
            filename: artwork.filename,
            width: metadata.width,
            height: metadata.height
          }
        },
        { status: 201 }
      )
    } catch (databaseError) {
      const { error: cleanupError } =
        await supabaseAdmin.storage
          .from('artworks')
          .remove([`${brand}/${id}/artwork.png`])

      if (cleanupError) {
        console.error(
          'Unable to clean up uploaded artwork:',
          cleanupError
        )
      }

      throw databaseError
    }
  } catch (error) {
    console.error('Artwork upload failed:', error)

    return NextResponse.json(
      { error: 'Unable to upload artwork.' },
      { status: 500 }
    )
  }
}
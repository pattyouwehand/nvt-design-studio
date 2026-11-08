import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { randomUUID } from 'node:crypto'
import { isBrandId } from '@/lib/brands'
import { listArtworks } from '@/lib/artworkDatabase'
import { uploadArtworkImage } from '@/lib/artworkStorage'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { defaultProductMetadata } from '@/lib/productMetadataTypes'
import type { Prisma } from '@/lib/generated/prisma/client'
import { getStudioUser } from '@/lib/auth'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 25 * 1024 * 1024

export async function POST(request: NextRequest) {
  const user = await getStudioUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const formData = await request.formData()

    const file = formData.get('artwork')
    const brand = formData.get('brand')

    if (typeof brand !== 'string' || !isBrandId(brand)) {
      return NextResponse.json(
        { error: 'Please select a valid brand.' },
        { status: 400 }
      )
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'Please upload an artwork.' },
        { status: 400 }
      )
    }

    if (file.type !== 'image/png') {
      return NextResponse.json(
        { error: 'Only PNG files are supported.' },
        { status: 400 }
      )
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File must be between 1 byte and 25 MB.' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const imageMetadata = await sharp(buffer).metadata()

    if (
      imageMetadata.format !== 'png' ||
      !imageMetadata.width ||
      !imageMetadata.height
    ) {
      return NextResponse.json(
        { error: 'Invalid PNG image.' },
        { status: 400 }
      )
    }

    if (
      imageMetadata.width > 10000 ||
      imageMetadata.height > 10000
    ) {
      return NextResponse.json(
        { error: 'Image dimensions are too large.' },
        { status: 400 }
      )
    }

    if (!imageMetadata.hasAlpha) {
      return NextResponse.json(
        { error: 'Artwork must have a transparency channel.' },
        { status: 400 }
      )
    }

    const id = randomUUID()
    const storagePath = await uploadArtworkImage(
      brand,
      id,
      buffer
    )

    try {
      await prisma.artwork.create({
        data: {
          id,
          brand,
          filename: file.name,
          metadata: defaultProductMetadata as unknown as Prisma.InputJsonValue
        }
      })
    } catch (databaseError) {
      // Remove the uploaded PNG if the database insert fails.
      const { error: cleanupError } = await supabaseAdmin.storage
        .from('artworks')
        .remove([storagePath])

      if (cleanupError) {
        console.error(
          'Unable to clean up uploaded artwork:',
          cleanupError
        )
      }

      throw databaseError
    }

    return NextResponse.json(
      {
        success: true,
        id,
        brand,
        filename: file.name,
        width: imageMetadata.width,
        height: imageMetadata.height
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Artwork upload failed:', error)

    return NextResponse.json(
      { error: 'Unable to upload artwork.' },
      { status: 500 }
    )
  }
}

export async function GET() {
  const user = await getStudioUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const artworks = await listArtworks()

    return NextResponse.json({ artworks })
  } catch (error) {
    console.error('Unable to list artworks:', error)

    return NextResponse.json(
      { error: 'Unable to load artworks.' },
      { status: 500 }
    )
  }
}
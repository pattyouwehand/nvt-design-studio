import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { getStudioUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

const BUCKET = 'artworks'
const MAX_FILE_SIZE = 25 * 1024 * 1024
const MAX_DIMENSION = 10000

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

    const file = formData.get('image')
    const name = formData.get('name')
    const productType = formData.get('productType')
    const color = formData.get('color')

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'Please select an image.' },
        { status: 400 }
      )
    }

    if (
      typeof name !== 'string' ||
      !name.trim() ||
      name.trim().length > 150
    ) {
      return NextResponse.json(
        { error: 'Please enter a valid image name.' },
        { status: 400 }
      )
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Image must be between 1 byte and 25 MB.' },
        { status: 400 }
      )
    }

    if (
      (productType !== null && typeof productType !== 'string') ||
      (color !== null && typeof color !== 'string') ||
      (typeof productType === 'string' && productType.length > 100) ||
      (typeof color === 'string' && color.length > 100)
    ) {
      return NextResponse.json(
        { error: 'Invalid product type or color.' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const metadata = await sharp(buffer).metadata()

    if (
      !metadata.format ||
      !['png', 'jpeg', 'webp'].includes(metadata.format) ||
      !metadata.width ||
      !metadata.height ||
      metadata.width > MAX_DIMENSION ||
      metadata.height > MAX_DIMENSION
    ) {
      return NextResponse.json(
        { error: 'Only valid PNG, JPEG and WebP images are supported.' },
        { status: 400 }
      )
    }

    // Convert the uploaded image to an optimized WebP.
    const optimizedImage = await sharp(buffer)
      .rotate()
      .resize({
        width: 1600,
        height: 1600,
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({
        quality: 85,
        effort: 6
      })
      .toBuffer()

    const id = randomUUID()
    const storagePath = `shared-images/${id}.webp`

    // Upload the optimized image to Supabase Storage.
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(storagePath, optimizedImage, {
        contentType: 'image/webp',
        upsert: false
      })

    if (uploadError) {
      throw uploadError
    }

    try {
      // Save image metadata in PostgreSQL.
      const image = await prisma.sharedImage.create({
        data: {
          id,
          name: name.trim(),
          storagePath,
          productType:
            typeof productType === 'string'
              ? productType.trim() || null
              : null,
          color:
            typeof color === 'string'
              ? color.trim() || null
              : null
        }
      })

      return NextResponse.json(
        {
          success: true,
          image
        },
        { status: 201 }
      )
    } catch (databaseError) {
      // Remove the uploaded file if saving to the database fails.
      const { error: cleanupError } = await supabaseAdmin.storage
        .from(BUCKET)
        .remove([storagePath])

      if (cleanupError) {
        console.error(
          'Unable to clean up shared image:',
          cleanupError
        )
      }

      throw databaseError
    }
  } catch (error) {
    console.error('Shared image upload failed:', error)

    return NextResponse.json(
      { error: 'Unable to upload shared image.' },
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
    const images = await prisma.sharedImage.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ images })
  } catch (error) {
    console.error('Unable to load shared images:', error)

    return NextResponse.json(
      { error: 'Unable to load shared images.' },
      { status: 500 }
    )
  }
}
import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { randomUUID } from 'crypto'
import { getStudioUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

type RouteContext = {
  params: Promise<{ id: string }>
}

const BUCKET = 'artworks'
const MAX_FILE_SIZE = 15 * 1024 * 1024

export async function PATCH( request: NextRequest, context: RouteContext ) {
  const user = await getStudioUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const { id } = await context.params
    const body = await request.json()

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Invalid request.' },
        { status: 400 }
      )
    }

    const { name, productType, color } = body

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

    const existingImage = await prisma.sharedImage.findUnique({
      where: { id }
    })

    if (!existingImage) {
      return NextResponse.json(
        { error: 'Image not found.' },
        { status: 404 }
      )
    }

    const image = await prisma.sharedImage.update({
      where: { id },
      data: {
        name: name.trim(),
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

    return NextResponse.json({
      success: true,
      image
    })
  } catch (error) {
    console.error('Unable to update shared image:', error)

    return NextResponse.json(
      { error: 'Unable to update image.' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  const user = await getStudioUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const { id } = await context.params

    const existingImage = await prisma.sharedImage.findUnique({
      where: { id }
    })

    if (!existingImage) {
      return NextResponse.json(
        { error: 'Image not found.' },
        { status: 404 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('image')

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'Please select an image.' },
        { status: 400 }
      )
    }

    if (
      !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)
    ) {
      return NextResponse.json(
        { error: 'Only PNG, JPEG and WebP images are allowed.' },
        { status: 400 }
      )
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Image must be smaller than 15 MB.' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    let optimizedImage: Buffer

    try {
      optimizedImage = await sharp(buffer, {
        limitInputPixels: 40_000_000
      })
        .rotate()
        .resize(1600, 1600, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({
          quality: 85,
          effort: 6
        })
        .toBuffer()
    } catch {
      return NextResponse.json(
        { error: 'Invalid or unsupported image file.' },
        { status: 400 }
      )
    }

    // A unique path avoids serving an outdated cached image.
    const newStoragePath = `shared-images/${id}-${randomUUID()}.webp`

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(newStoragePath, optimizedImage, {
        contentType: 'image/webp',
        upsert: false
      })

    if (uploadError) {
      console.error('Unable to upload replacement:', uploadError)

      return NextResponse.json(
        { error: 'Unable to upload replacement image.' },
        { status: 500 }
      )
    }

    try {
      const image = await prisma.sharedImage.update({
        where: { id },
        data: {
          storagePath: newStoragePath
        }
      })

      // Do not delete the previous file here.
      // Published storefronts may still reference its URL.
      return NextResponse.json({
        success: true,
        image
      })
    } catch (error) {
      await supabaseAdmin.storage
        .from(BUCKET)
        .remove([newStoragePath])

      throw error
    }
  } catch (error) {
    console.error('Unable to replace shared image:', error)

    return NextResponse.json(
      { error: 'Unable to replace image.' },
      { status: 500 }
    )
  }
}


export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  const user = await getStudioUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const { id } = await context.params

    const existingImage = await prisma.sharedImage.findUnique({
      where: { id }
    })

    if (!existingImage) {
      return NextResponse.json(
        { error: 'Image not found.' },
        { status: 404 }
      )
    }

    // Never delete an image linked to a product.
    const linkedProducts = await prisma.productSharedImage.count({
      where: {
        sharedImageId: id
      }
    })

    if (linkedProducts > 0) {
      return NextResponse.json(
        {
          error: `This image is used by ${linkedProducts} product(s). Remove the product links before deleting it.`
        },
        { status: 409 }
      )
    }

    // Delete the database record first.
    // The relation check above prevents deleting linked images.
    await prisma.sharedImage.delete({
      where: { id }
    })

    // Remove the current file from private Supabase Storage.
    const { error: storageError } = await supabaseAdmin.storage
      .from(BUCKET)
      .remove([existingImage.storagePath])

    if (storageError) {
      console.error(
        'Shared image deleted from database, but storage cleanup failed:',
        storageError
      )

      return NextResponse.json({
        success: true,
        warning: 'Image deleted, but storage cleanup could not be completed.'
      })
    }

    return NextResponse.json({
      success: true
    })
  } catch (error) {
    console.error('Unable to delete shared image:', error)

    return NextResponse.json(
      { error: 'Unable to delete image.' },
      { status: 500 }
    )
  }
}
import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { randomUUID } from 'node:crypto'
import { isBrandId } from '@/lib/brands'
import { uploadArtworkImage } from '@/lib/artworkStorage'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getStudioUser } from '@/lib/auth'

export const runtime = 'nodejs'
const MAX_FILE_SIZE = 25 * 1024 * 1024

export async function GET() {
  if (!await getStudioUser()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const artworks = await prisma.artwork.findMany({
      select: { id: true, brand: true, filename: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json({ artworks: artworks.filter((artwork) => isBrandId(artwork.brand)) })
  } catch (error) {
    console.error('Unable to list artworks:', error)
    return NextResponse.json({ error: 'Unable to load artworks.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!await getStudioUser()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const formData = await request.formData()
    const file = formData.get('artwork')
    const brand = formData.get('brand')
    if (typeof brand !== 'string' || !isBrandId(brand)) return NextResponse.json({ error: 'Invalid brand.' }, { status: 400 })
    if (!(file instanceof File) || file.type !== 'image/png' || file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Upload a PNG up to 25 MB.' }, { status: 400 })
    }
    const buffer = Buffer.from(await file.arrayBuffer())
    const info = await sharp(buffer).metadata()
    if (info.format !== 'png' || !info.width || !info.height || info.width > 10000 || info.height > 10000 || !info.hasAlpha) {
      return NextResponse.json({ error: 'Invalid PNG, dimensions, or missing transparency channel.' }, { status: 400 })
    }
    const id = randomUUID()
    const storagePath = await uploadArtworkImage(brand, id, buffer)
    try {
      await prisma.artwork.create({ data: { id, brand, filename: file.name, metadata: {} } })
    } catch (databaseError) {
      const { error } = await supabaseAdmin.storage.from('artworks').remove([storagePath])
      if (error) console.error('Artwork upload cleanup failed:', error)
      throw databaseError
    }
    return NextResponse.json({ success: true, id, brand, filename: file.name, width: info.width, height: info.height }, { status: 201 })
  } catch (error) {
    console.error('Artwork upload failed:', error)
    return NextResponse.json({ error: 'Unable to upload artwork.' }, { status: 500 })
  }
}

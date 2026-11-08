import 'server-only'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { BrandId } from '@/lib/brands'

const BUCKET = 'artworks'

function getStoragePath( brand: BrandId, id: string, filename: string ) {
  return `${brand}/${id}/${filename}`
}

export async function uploadArtworkImage( brand: BrandId, id: string, image: Buffer ) {
  const storagePath = getStoragePath(
    brand,
    id,
    'artwork.png'
  )

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath, image, {
      contentType: 'image/png',
      upsert: false
    })

  if (error) throw error

  return storagePath
}

export async function getArtworkImage( brand: BrandId, id: string ): Promise<Buffer> {
  const storagePath = getStoragePath(
    brand,
    id,
    'artwork.png'
  )

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .download(storagePath)

  if (error) throw error

  return Buffer.from(await data.arrayBuffer())
}

export async function uploadArtworkMockup(
  brand: BrandId,
  id: string,
  filename: string,
  image: Buffer
) {
  const storagePath = getStoragePath(
    brand,
    id,
    `mockups/${filename}`
  )

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath, image, {
      contentType: 'image/webp',
      upsert: true
    })

  if (error) throw error

  return storagePath
}

export async function getArtworkMockup( brand: BrandId, id: string, filename: string ): Promise<Buffer> {
  const storagePath = getStoragePath(
    brand,
    id,
    `mockups/${filename}`
  )

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .download(storagePath)

  if (error) throw error

  return Buffer.from(await data.arrayBuffer())
}
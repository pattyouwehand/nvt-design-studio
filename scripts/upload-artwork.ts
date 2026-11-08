import 'dotenv/config'
import path from 'node:path'
import { readFile, readdir } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'

const brand = 'legends'
const artworkId = '780a50fa-7c6e-4345-bbe1-27885576df94'

async function main() {
  const url = process.env.SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY

  if (!url || !secretKey) {
    throw new Error('Missing Supabase environment variables')
  }

  const supabase = createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  const directory = path.join(
    process.cwd(),
    'designs',
    brand,
    artworkId
  )

  async function uploadFile(
    localPath: string,
    storagePath: string,
    contentType: string
  ) {
    const file = await readFile(localPath)

    const { error } = await supabase.storage
      .from('artworks')
      .upload(storagePath, file, {
        contentType,
        upsert: false,
      })

    if (error) {
      // Already uploaded? Leave the existing file untouched.
      if (error.statusCode === '409') {
        console.log('Already exists, skipping:', storagePath)
        return
      }

      throw error
    }

    console.log('Uploaded:', storagePath)
  }

  // Original artwork
  await uploadFile(
    path.join(directory, 'artwork.png'),
    `${brand}/${artworkId}/artwork.png`,
    'image/png'
  )

  // Mockups
  const mockupDirectory = path.join(directory, 'mockups')

  const files = await readdir(mockupDirectory)

  for (const filename of files) {
    if (!filename.endsWith('.webp')) continue

    await uploadFile(
      path.join(mockupDirectory, filename),
      `${brand}/${artworkId}/mockups/${filename}`,
      'image/webp'
    )
  }

  console.log('Artwork and mockups upload completed!')
}

main().catch((error) => {
  console.error('Upload failed:', error)
  process.exitCode = 1
})
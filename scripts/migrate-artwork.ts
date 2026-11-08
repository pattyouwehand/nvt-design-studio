import 'dotenv/config'
import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { PrismaClient } from '../lib/generated/prisma/client'

const prisma = new PrismaClient()

async function main() {
  const brand = process.argv[2]
  const artworkId = process.argv[3]

  if (!brand || !artworkId) {
    throw new Error(
      'Usage: npx tsx scripts/migrate-artwork.ts <brand> <artwork-id>'
    )
  }

  const allowedBrands = [
    't4c',
    'legends',
    'little-monsters',
    'everyday-originals'
  ]

  if (!allowedBrands.includes(brand)) {
    throw new Error('Invalid brand')
  }

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  if (!uuidRegex.test(artworkId)) {
    throw new Error('Invalid artwork ID')
  }

  const directory = path.join(
    process.cwd(),
    'designs',
    brand,
    artworkId
  )

  const metadataPath = path.join(directory, 'metadata.json')

  const metadata = JSON.parse(
    await readFile(metadataPath, 'utf8')
  )

  const existing = await prisma.artwork.findUnique({
    where: { id: artworkId },
  })

  if (existing) {
    console.log('Artwork already exists in Supabase. Skipping.')
    return
  }

  const artwork = await prisma.artwork.create({
    data: {
      id: artworkId,
      brand,
      filename: 'artwork.png',
      metadata
    }
  })

  console.log('Artwork migrated successfully!')
  console.log('Brand:', artwork.brand)
  console.log('ID:', artwork.id)
}

main()
  .catch((error) => {
    console.error('Migration failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

  // $ npx tsx scripts/migrate-artwork.ts legends 780a50fa-7c6e-4345-bbe1-27885576df94
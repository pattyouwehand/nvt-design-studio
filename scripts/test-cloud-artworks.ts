import 'dotenv/config'
import { PrismaClient } from '../lib/generated/prisma/client'

const prisma = new PrismaClient()

async function main() {
  const artworks = await prisma.artwork.findMany({
    orderBy: {
      createdAt: 'desc'
    }
  })

  console.log(`Found ${artworks.length} artworks in PostgreSQL`)

  for (const artwork of artworks) {
    console.log({
      id: artwork.id,
      brand: artwork.brand,
      filename: artwork.filename,
      metadata: artwork.metadata,
      createdAt: artwork.createdAt.toISOString()
    })
  }
}

main()
  .catch((error) => {
    console.error('Database test failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
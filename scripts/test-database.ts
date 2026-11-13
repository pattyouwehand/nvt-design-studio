
import 'dotenv/config'
import { PrismaClient } from '@/lib/generated/prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Testing database connection...')

  // Test database connection
  await prisma.$connect()
  console.log('Database connected!')

  // Create a temporary artwork
  const artwork = await prisma.artwork.create({
    data: {
      brand: 't4c',
      filename: 'artwork.png',
    },
  })

  console.log('Artwork created:', artwork.id)

  try {
    // Retrieve the artwork
    const saved = await prisma.artwork.findUnique({
      where: { id: artwork.id },
    })

    if (!saved) {
      throw new Error('Artwork could not be retrieved.')
    }

    console.log('Artwork retrieved:', saved.filename)
  } finally {
    // Always remove the temporary artwork
    await prisma.artwork.delete({
      where: { id: artwork.id },
    })

    console.log('Test artwork removed.')
  }

  console.log('Test completed! Database connection works.')
}

main()
  .catch((error) => {
    console.error('Database test failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

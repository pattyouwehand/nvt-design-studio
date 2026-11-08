import 'dotenv/config'
import { PrismaClient } from '@/lib/generated/prisma/client'

const prisma = new PrismaClient()

async function main() {
  const artwork = await prisma.artwork.create({
    data: {
      brand: 't4c',
      filename: 'artwork.png',
      metadata: {
        title: 'Database Connection Test',
        status: 'draft',
      },
    },
  })

  console.log('Artwork created:', artwork.id)

  const saved = await prisma.artwork.findUnique({
    where: { id: artwork.id },
  })

  console.log('Artwork retrieved:', saved?.metadata)

  // Alleen het testrecord verwijderen
  await prisma.artwork.delete({
    where: { id: artwork.id },
  })

  console.log('Test completed! Database connection works.')
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })
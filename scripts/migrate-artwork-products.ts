import 'dotenv/config'
import { PrismaClient, Prisma } from '../lib/generated/prisma/client'

const prisma = new PrismaClient()

async function main() {
  const artworks = await prisma.artwork.findMany()

  let created = 0
  let skipped = 0

  for (const artwork of artworks) {
    const metadata = artwork.metadata as Record<string, unknown>

    const title = metadata.title
    const slug = metadata.slug
    const productType = metadata.productType

    if (
      typeof title !== 'string' || !title.trim() ||
      typeof slug !== 'string' || !slug.trim() ||
      typeof productType !== 'string' || !productType.trim()
    ) {
      skipped++
      continue
    }

    const existing = await prisma.product.findFirst({
      where: {
        artworkId: artwork.id,
        productType
      }
    })

    if (existing) {
      skipped++
      continue
    }

    await prisma.product.create({
      data: {
        artworkId: artwork.id,
        brand: artwork.brand,
        productType,
        title: title.trim(),
        slug: slug.trim(),
        description:
          typeof metadata.description === 'string'
            ? metadata.description
            : '',
        price:
          typeof metadata.price === 'number'
            ? metadata.price
            : null,
        status: 'draft',
        sizes: Array.isArray(metadata.sizes)
          ? metadata.sizes
          : [],
        colors: Array.isArray(metadata.colors)
          ? metadata.colors
          : [],
        category:
          typeof metadata.category === 'string'
            ? metadata.category
            : '',
        collections: Array.isArray(metadata.collections)
          ? metadata.collections
          : [],
        metadata: metadata as Prisma.InputJsonValue
      }
    })

    created++
  }

  console.log(`Created: ${created}`)
  console.log(`Skipped: ${skipped}`)
}

main()
  .catch((error) => {
    console.error('Product migration failed:', error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
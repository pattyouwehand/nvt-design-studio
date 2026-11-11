import { NextResponse } from 'next/server'
import { getStudioUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET() {
  if (!(await getStudioUser())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [products, published] = await Promise.all([
      prisma.product.findMany({
        select: {
          id: true,
          artworkId: true,
          brand: true,
          title: true,
          slug: true,
          productType: true,
          status: true,
          colors: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.publishedProduct.findMany({ select: { productId: true } })
    ])

    const publishedIds = new Set(published.map((item) => item.productId))
    return NextResponse.json({
      products: products.map((product) => ({
        ...product,
        isPublished: publishedIds.has(product.id)
      }))
    })
  } catch (error) {
    console.error('Unable to list products:', error)
    return NextResponse.json({ error: 'Unable to load products.' }, { status: 500 })
  }
}

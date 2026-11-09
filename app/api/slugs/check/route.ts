import { NextRequest, NextResponse } from 'next/server'
import { isBrandId } from '@/lib/brands'
import { isArtworkId } from '@/lib/artworks'
import { isSlugTaken } from '@/lib/productMetadata'
import { getStudioUser } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const user = await getStudioUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const brand = searchParams.get('brand')
  const slug = searchParams.get('slug')
  const artworkId = searchParams.get('artworkId')

  if (
    !brand ||
    !isBrandId(brand) ||
    !slug ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
    (artworkId !== null && !isArtworkId(artworkId))
  ) {
    return NextResponse.json(
      { error: 'Invalid slug check parameters.' },
      { status: 400 }
    )
  }

  try {
    const taken = await isSlugTaken(
      brand,
      slug,
      artworkId ?? undefined
    )

    return NextResponse.json({ available: !taken })
  } catch (error) {
    console.error('Unable to check slug:', error)

    return NextResponse.json(
      { error: 'Unable to check slug.' },
      { status: 500 }
    )
  }
}
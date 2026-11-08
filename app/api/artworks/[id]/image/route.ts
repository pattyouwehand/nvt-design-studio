import { NextRequest, NextResponse } from 'next/server'
import { isBrandId } from '@/lib/brands'
import { isArtworkId } from '@/lib/artworks'
import { getArtworkImage } from '@/lib/artworkStorage'
import { getStudioUser } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(request: NextRequest,{ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const brand = request.nextUrl.searchParams.get('brand')
  const user = await getStudioUser()

  if (!user) {
    return Response.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  if (!brand || !isBrandId(brand) || !isArtworkId(id)) {
    return NextResponse.json(
      { error: 'Invalid artwork.' },
      { status: 400 }
    )
  }

  try {
    const image = await getArtworkImage(brand, id)

    return new NextResponse(new Uint8Array(image), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store'
      },
    })
  } catch (error) {
    console.error('Unable to load artwork image:', error)

    return NextResponse.json(
      { error: 'Unable to load artwork.' },
      { status: 500 }
    )
  }
}
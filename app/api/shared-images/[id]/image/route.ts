import { NextRequest, NextResponse } from 'next/server'
import { getStudioUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getStudioUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const { id } = await context.params

    const image = await prisma.sharedImage.findUnique({
      where: { id }
    })

    if (!image) {
      return NextResponse.json(
        { error: 'Image not found.' },
        { status: 404 }
      )
    }

    const { data, error } = await supabaseAdmin.storage
      .from('artworks')
      .download(image.storagePath)

    if (error || !data) {
      return NextResponse.json(
        { error: 'Unable to load image.' },
        { status: 404 }
      )
    }

    const buffer = await data.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff'
      }
    })
  } catch (error) {
    console.error('Shared image preview failed:', error)

    return NextResponse.json(
      { error: 'Unable to load image.' },
      { status: 500 }
    )
  }
}
import { NextResponse } from 'next/server'
import { getStudioUser } from '@/lib/auth'

// The old artwork-based ZIP exporter used removed product metadata.
// Product publication continues through /api/products/[id]/publish.
export async function GET() {
  if (!(await getStudioUser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ error: 'Legacy artwork export is retired. Publish from the Product Editor.' }, { status: 410 })
}

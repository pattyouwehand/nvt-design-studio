import { redirect } from 'next/navigation'
import { getStudioUser } from '@/lib/auth'
import ArtworkDetail from './ArtworkDetail'

export default async function ArtworkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getStudioUser()

  if (!user) {
    redirect('/login')
  }

  return <ArtworkDetail params={params} />
}
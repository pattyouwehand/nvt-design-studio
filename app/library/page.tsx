import { redirect } from 'next/navigation'
import { getStudioUser } from '@/lib/auth'
import ArtworkLibrary from './ArtworkLibrary'

export default async function LibraryPage() {
  const user = await getStudioUser()

  if (!user) {
    redirect('/login')
  }

  return <ArtworkLibrary />
}
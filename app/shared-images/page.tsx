import { redirect } from 'next/navigation'
import { getStudioUser } from '@/lib/auth'
import SharedImageLibrary from './SharedImageLibrary'

export default async function SharedImagesPage() {
  const user = await getStudioUser()

  if (!user) {
    redirect('/login')
  }

  return <SharedImageLibrary />
}
import { redirect } from 'next/navigation'
import { getStudioUser } from '@/lib/auth'
import StudioHome from './StudioHome'

export default async function HomePage() {
  const user = await getStudioUser()

  if (!user) {
    redirect('/login')
  }

  return <StudioHome />
}
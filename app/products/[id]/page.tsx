import { redirect } from 'next/navigation'
import { getStudioUser } from '@/lib/auth'
import ProductEditor from './ProductEditor'
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await getStudioUser())) redirect('/login')
  const { id } = await params
  return <ProductEditor id={id} />
}

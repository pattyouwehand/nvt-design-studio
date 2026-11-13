import { redirect } from 'next/navigation'
import { getStudioUser } from '@/lib/auth'
import ProductLibrary from './ProductLibrary'

export default async function ProductsPage() {
  if (!(await getStudioUser())) redirect('/login')
  return <ProductLibrary />
}

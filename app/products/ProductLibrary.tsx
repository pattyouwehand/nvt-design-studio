'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { brands, type BrandId } from '@/lib/brands'

type ProductItem = {
  id: string
  artworkId: string
  brand: BrandId
  title: string
  slug: string
  productType: string
  status: string
  colors: unknown
  createdAt: string
  isPublished: boolean
}

function ProductThumbnail({ product }: { product: ProductItem }) {
  const [failed, setFailed] = useState(false)
  const color = Array.isArray(product.colors) && typeof product.colors[0] === 'string' ? product.colors[0] : 'black'
  const mockup = `/api/mockups/${product.artworkId}?brand=${encodeURIComponent(product.brand)}&productType=${encodeURIComponent(product.productType)}&color=${encodeURIComponent(color)}`
  const original = `/api/artworks/${product.artworkId}/image?brand=${encodeURIComponent(product.brand)}`

  return (
    <div className="relative aspect-square bg-neutral-100">
      <Image src={failed ? original : mockup} onError={() => setFailed(true)} alt={product.title || 'Draft product'} fill unoptimized sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" className="object-contain p-5" />
    </div>
  )
}

export default function ProductLibrary() {
  const [products, setProducts] = useState<ProductItem[]>([])
  const [brand, setBrand] = useState('all')
  const [status, setStatus] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const response = await fetch('/api/products', { cache: 'no-store', signal: controller.signal })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Unable to load products.')
        setProducts(data.products)
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Unable to load products.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [])

  const filtered = useMemo(() => products.filter((item) =>
    (brand === 'all' || item.brand === brand) &&
    (status === 'all' || (status === 'published' ? item.isPublished : status === 'unpublished' ? !item.isPublished : item.status === status))
  ), [products, brand, status])

  return (
    <main className="min-h-screen bg-[#F5F2EB] px-6 py-12 text-[#171717]">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-medium uppercase tracking-widest text-neutral-500">NVT Design Studio</p>
            <h1 className="text-4xl font-bold">Product Library</h1>
            <p className="mt-3 text-neutral-600">One card per product, with its own publication status.</p>
          </div>
          <Link href="/library" className="rounded-lg border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold hover:bg-neutral-100">Artwork Library</Link>
        </header>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <p className="mr-auto text-sm text-neutral-600">{filtered.length} products</p>
          <select aria-label="Filter by brand" value={brand} onChange={(event) => setBrand(event.target.value)} className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm">
            <option value="all">All brands</option>
            {brands.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm">
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="ready">Ready</option>
            <option value="published">Published</option>
            <option value="unpublished">Not published</option>
          </select>
        </div>
        {loading && <p>Loading products...</p>}
        {error && <p role="alert" className="text-red-700">{error}</p>}
        {!loading && !error && filtered.length === 0 && <p className="rounded-xl bg-white p-10 text-center text-neutral-600">No products found.</p>}
        {!loading && !error && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((product) => (
              <Link key={product.id} href={`/products/${product.id}`} className="overflow-hidden rounded-xl border border-neutral-200 bg-white transition hover:shadow-md">
                <ProductThumbnail product={product} />
                <div className="p-4">
                  <p className="truncate font-semibold">{product.title || 'Untitled draft'}</p>
                  <p className="mt-1 text-sm text-neutral-500">{brands.find((entry) => entry.id === product.brand)?.name ?? product.brand}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-neutral-100 px-3 py-1 capitalize">{product.status}</span>
                    <span className="rounded-full bg-neutral-100 px-3 py-1">{product.isPublished ? 'Published' : 'Not published'}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

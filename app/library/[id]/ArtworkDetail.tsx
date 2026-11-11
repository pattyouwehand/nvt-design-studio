'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { brands, isBrandId, type BrandId } from '@/lib/brands'
import { productCatalog } from '@/lib/catalog/products'

type LinkedProduct = {
  id: string
  title: string
  slug: string
  productType: string
  status: string
  isPublished: boolean
}
type ArtworkDetails = {
  id: string
  brand: BrandId
  filename: string
  createdAt: string
  linkedProducts: LinkedProduct[]
}

export default function ArtworkDetail({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const brandParam = searchParams.get('brand')
  const brand = brandParam && isBrandId(brandParam) ? brandParam : null
  const [id, setId] = useState<string | null>(null)
  const [artwork, setArtwork] = useState<ArtworkDetails | null>(null)
  const [productType, setProductType] = useState(productCatalog[0]?.id ?? 'classic-tee')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void params.then(({ id: resolvedId }) => { if (active) setId(resolvedId) })
    return () => { active = false }
  }, [params])

  useEffect(() => {
    if (!id || !brand) { if (id) setLoading(false); return }
    const controller = new AbortController()
    async function load() {
      setLoading(true)
      setError('')
      try {
        const response = await fetch(`/api/artworks/${id}?brand=${brand}`, { cache: 'no-store', signal: controller.signal })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Unable to load artwork.')
        setArtwork(data)
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Unable to load artwork.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [id, brand])

  async function createProduct() {
    if (!id || !brand || busy) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`/api/artworks/${id}/products?brand=${brand}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productType })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to create product.')
      router.push(`/products/${data.productId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create product.')
    } finally { setBusy(false) }
  }

  async function deleteArtwork() {
    if (!id || !brand || !artwork || busy) return
    if (artwork.linkedProducts.length > 0) {
      setError('Remove linked products before deleting this artwork.')
      return
    }
    if (!window.confirm(`Permanently delete ${artwork.filename}? This cannot be undone.`)) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`/api/artworks/${id}?brand=${brand}`, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to delete artwork.')
      router.push('/library')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete artwork.')
    } finally { setBusy(false) }
  }

  return (
    <main className="min-h-screen bg-[#F5F2EB] px-6 py-12 text-[#171717]">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div><p className="mb-2 text-sm uppercase tracking-widest text-neutral-500">NVT Design Studio</p>
            <h1 className="text-4xl font-bold">Artwork Detail</h1>
            <p className="mt-2 text-neutral-600">Original artwork and linked products</p></div>
          <div className="flex gap-3"><Link className="rounded-lg border border-neutral-300 bg-white px-4 py-3 font-semibold" href="/library">Artwork Library</Link>
            <Link className="rounded-lg border border-neutral-300 bg-white px-4 py-3 font-semibold" href="/products">Product Library</Link></div>
        </div>
        {!brand && <p role="alert" className="text-red-700">Missing or invalid brand in URL.</p>}
        {loading && <p>Loading artwork...</p>}
        {error && <p role="alert" className="mb-5 text-red-700">{error}</p>}
        {!loading && artwork && brand && id && (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <section className="rounded-xl border border-neutral-200 bg-white p-6">
              <div className="relative aspect-square overflow-hidden rounded-lg bg-neutral-100">
                <Image src={`/api/artworks/${id}/image?brand=${brand}`} alt={artwork.filename} fill unoptimized sizes="(max-width: 1024px) 100vw, 50vw" className="object-contain p-5" />
              </div>
              <h2 className="mt-5 break-all text-lg font-bold">{artwork.filename}</h2>
              <p className="mt-2 text-sm text-neutral-500">{brands.find((item) => item.id === brand)?.name} · {new Date(artwork.createdAt).toLocaleDateString('en-GB')}</p>
              <a href={`/api/artworks/${id}/image?brand=${brand}`} download={artwork.filename} className="mt-5 inline-block rounded-lg border border-neutral-300 px-4 py-2 font-semibold hover:bg-neutral-50">Open original PNG</a>
              <div className="mt-8 border-t pt-5"><button type="button" onClick={() => void deleteArtwork()} disabled={busy || artwork.linkedProducts.length > 0} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-40">Delete artwork</button>
                {artwork.linkedProducts.length > 0 && <p className="mt-2 text-xs text-neutral-500">Delete linked products first.</p>}</div>
            </section>
            <div className="space-y-6">
              <section className="rounded-xl border border-neutral-200 bg-white p-6">
                <h2 className="text-xl font-bold">Create product</h2>
                <p className="mt-2 text-sm text-neutral-600">Each product has its own details, variants and publishing status.</p>
                <label className="mt-5 block text-sm font-semibold">Product type
                  <select value={productType} onChange={(event) => setProductType(event.target.value)} className="mt-2 block w-full rounded-lg border border-neutral-300 bg-white p-3">
                    {productCatalog.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
                  </select>
                </label>
                <button type="button" disabled={busy || !productType} onClick={() => void createProduct()} className="mt-5 rounded-lg bg-neutral-900 px-5 py-3 font-semibold text-white disabled:opacity-50">{busy ? 'Please wait...' : '+ Create product'}</button>
              </section>
              <section className="rounded-xl border border-neutral-200 bg-white p-6">
                <h2 className="text-xl font-bold">Linked products ({artwork.linkedProducts.length})</h2>
                {artwork.linkedProducts.length === 0 ? <p className="mt-4 text-neutral-500">No products yet. Create one above.</p> :
                  <div className="mt-5 space-y-3">{artwork.linkedProducts.map((product) => (
                    <Link key={product.id} href={`/products/${product.id}`} className="block rounded-lg border border-neutral-200 p-4 hover:bg-neutral-50">
                      <div className="flex items-center justify-between gap-3"><strong>{product.title || 'Untitled draft'}</strong><span className="text-xs text-neutral-500">{product.isPublished ? 'Published' : product.status}</span></div>
                      <p className="mt-1 text-sm text-neutral-500">{product.productType} · {product.slug}</p>
                    </Link>
                  ))}</div>}
              </section>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

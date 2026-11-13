'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { brands, type BrandId } from '@/lib/brands'

type ArtworkListItem = {
  id: string
  brand: BrandId
  filename: string
  createdAt: string
}

export default function ArtworkLibrary() {
  const [artworks, setArtworks] = useState<ArtworkListItem[]>([])
  const [brand, setBrand] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const response = await fetch('/api/artworks', { cache: 'no-store', signal: controller.signal })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Unable to load artworks.')
        setArtworks(data.artworks)
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Unable to load artworks.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [])

  const filtered = useMemo(() => artworks.filter((item) => brand === 'all' || item.brand === brand), [artworks, brand])

  return (
    <main className="min-h-screen bg-[#F5F2EB] px-6 py-12 text-[#171717]">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-medium uppercase tracking-widest text-neutral-500">NVT Design Studio</p>
            <h1 className="text-4xl font-bold">Artwork Library</h1>
            <p className="mt-3 text-neutral-600">Original artwork files, independent of products.</p>
          </div>
          <nav className="flex flex-wrap gap-3">
            <Link href="/" className="rounded-lg bg-neutral-900 px-5 py-3 text-sm font-semibold text-white hover:bg-neutral-700">+ Upload artwork</Link>
            <Link href="/products" className="rounded-lg border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold hover:bg-neutral-100">Product Library</Link>
            <Link href="/shared-images" className="rounded-lg border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold hover:bg-neutral-100">Shared Images</Link>
          </nav>
        </header>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-neutral-600">{filtered.length} artworks</p>
          <label className="flex items-center gap-3 text-sm font-medium">
            Brand
            <select value={brand} onChange={(event) => setBrand(event.target.value)} className="rounded-lg border border-neutral-300 bg-white px-4 py-2">
              <option value="all">All brands</option>
              {brands.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
        </div>
        {loading && <p>Loading artworks...</p>}
        {error && <p role="alert" className="text-red-700">{error}</p>}
        {!loading && !error && filtered.length === 0 && <p className="rounded-xl bg-white p-10 text-center text-neutral-600">No artworks found.</p>}
        {!loading && !error && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((item) => (
              <Link key={item.id} href={`/library/${item.id}?brand=${item.brand}`} className="overflow-hidden rounded-xl border border-neutral-200 bg-white transition hover:shadow-md">
                <div className="relative aspect-square bg-neutral-100">
                  <Image src={`/api/artworks/${item.id}/image?brand=${item.brand}`} alt={item.filename} fill unoptimized sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" className="object-contain p-5" />
                </div>
                <div className="p-4">
                  <p className="truncate font-semibold" title={item.filename}>{item.filename}</p>
                  <p className="mt-1 text-sm text-neutral-500">{brands.find((entry) => entry.id === item.brand)?.name ?? item.brand}</p>
                  <p className="mt-2 text-xs text-neutral-400">{new Date(item.createdAt).toLocaleDateString('en-GB')}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

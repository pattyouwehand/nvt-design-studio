'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { brands, type BrandId } from '@/lib/brands'
import type { ProductMetadata } from '@/lib/productMetadataTypes'
import SignOutButton from '@/components/SignOutButton'

interface Artwork {
  id: string
  brand: BrandId
  filename: string
  createdAt: string
  hasMockup: boolean
  mockupColor: string | null
  metadata: ProductMetadata
}

type BrandFilter = BrandId | 'all'
type StatusFilter = 'all' | 'draft' | 'ready'

export default function ArtworkLibraryPage() {
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [brandFilter, setBrandFilter] = useState<BrandFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadArtworks() {
      try {
        const response = await fetch('/api/artworks', {
          cache: 'no-store'
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(
            result.error || 'Unable to load artworks.'
          )
        }

        setArtworks(result.artworks)

      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : 'Something went wrong.'
        )
      } finally {
        setLoading(false)
      }
    }

    loadArtworks()
  }, [])

  const brandArtworks = useMemo(() => {
    return artworks.filter(
      (artwork) =>
        brandFilter === 'all' ||
        artwork.brand === brandFilter
    )
  }, [artworks, brandFilter])

  const filteredArtworks = useMemo(() => {
    return brandArtworks.filter(
      (artwork) =>
        statusFilter === 'all' ||
        artwork.metadata.status === statusFilter
    )
  }, [brandArtworks, statusFilter])

  const draftCount = brandArtworks.filter(
    (artwork) => artwork.metadata.status === 'draft'
  ).length

  const readyCount = brandArtworks.filter((artwork) => artwork.metadata.status === 'ready').length

  return (
    <main className="min-h-screen bg-[#F5F2EB] px-6 py-12 text-[#171717]">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="mb-2 text-sm font-medium uppercase tracking-widest text-neutral-500">
              NVT Design Studio
            </p>

            <h1 className="text-4xl font-bold">
              Artwork Library
            </h1>

            <p className="mt-3 text-neutral-600">
              Manage your designs and prepare them for your storefronts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="rounded-lg bg-neutral-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-700"
            >
              + New artwork
            </Link>
            <SignOutButton />
          </div>
        </header>

        {/* Overview */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <p className="text-sm text-neutral-500">
              Total artworks
            </p>
            <p className="mt-2 text-3xl font-bold">
              {brandArtworks.length}
            </p>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <p className="text-sm text-neutral-500">
              Draft
            </p>
            <p className="mt-2 text-3xl font-bold">
              {draftCount}
            </p>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <p className="text-sm text-neutral-500">
              Ready for export
            </p>
            <p className="mt-2 text-3xl font-bold">
              {readyCount}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <select
            value={brandFilter}
            onChange={(event) =>
              setBrandFilter(
                event.target.value as BrandFilter
              )
            }
            className="rounded-lg border border-neutral-300 bg-white px-4 py-3 text-sm"
          >
            <option value="all">All brands</option>

            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>

          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'draft', label: 'Draft' },
                { id: 'ready', label: 'Ready for export' },
              ] as const
            ).map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setStatusFilter(filter.id)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  statusFilter === filter.id
                    ? 'bg-neutral-900 text-white'
                    : 'border border-neutral-300 bg-white text-neutral-600 hover:border-neutral-900'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <p className="text-neutral-500">
            Loading artworks...
          </p>
        )}

        {error && (
          <p className="text-red-700">{error}</p>
        )}

        {!loading && !error && filteredArtworks.length === 0 && (
          <div className="rounded-xl border border-neutral-200 bg-white p-12 text-center">
            <h2 className="text-lg font-semibold">
              No artworks found
            </h2>
            <p className="mt-2 text-neutral-500">
              Try changing your filters or add a new design.
            </p>
          </div>
        )}

        {/* Artwork grid */}
        {!loading && !error && filteredArtworks.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredArtworks.map((artwork) => {
              const brandName =
                brands.find(
                  (brand) => brand.id === artwork.brand
                )?.name ?? artwork.brand

              const title =
                artwork.metadata.title.trim() ||
                'Untitled artwork'

              const imageUrl =
                artwork.hasMockup && artwork.mockupColor
                  ? `/api/mockups/${artwork.id}?${new URLSearchParams({
                      brand: artwork.brand,
                      productType: artwork.metadata.productType,
                      color: artwork.mockupColor,
                    }).toString()}`
                  : `/api/artworks/${artwork.id}/image?brand=${artwork.brand}`

              return (
                <Link
                  key={`${artwork.brand}-${artwork.id}`}
                  href={`/library/${artwork.id}?brand=${artwork.brand}`}
                  className="group overflow-hidden rounded-xl border border-neutral-200 bg-white transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="relative aspect-square bg-neutral-100">
                    <Image
                      src={imageUrl}
                      alt={title}
                      fill
                      unoptimized
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-contain p-4 transition duration-300 group-hover:scale-105"
                    />
                  </div>

                  <div className="p-5">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                      {brandName}
                    </p>

                    <h2 className="line-clamp-2 min-h-12 font-semibold">
                      {title}
                    </h2>

                    <div className="mt-4 flex items-center justify-between gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          artwork.metadata.status === 'ready'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-neutral-100 text-neutral-600'
                        }`}
                      >
                        {artwork.metadata.status === 'ready'
                          ? 'Ready for export'
                          : 'Draft'}
                      </span>

                      <span className="text-xs text-neutral-400">
                        {artwork.hasMockup
                          ? 'Mockup ready'
                          : 'No mockup'}
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
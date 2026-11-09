'use client'

import { use, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter,useSearchParams } from 'next/navigation'
import { brands, type BrandId } from '@/lib/brands'
import { productOptions } from '@/lib/productOptions'
import { defaultProductMetadata, type ProductMetadata } from '@/lib/productMetadataTypes'
import { slugify } from '@/lib/slugify'
import { productCatalog } from '@/lib/catalog/products'

interface ArtworkDetail {
  id: string
  brand: BrandId
  filename: string
  createdAt: string
  hasMockup: boolean
  metadata: ProductMetadata
}

export default function ArtworkDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const searchParams = useSearchParams()
  const brand = searchParams.get('brand')

  const [artwork, setArtwork] = useState<ArtworkDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [mockupVersion, setMockupVersion] = useState(0)
  const [selectedColor, setSelectedColor] = useState('black')
  const [availableMockups, setAvailableMockups] = useState<string[]>([])
  const [checkingMockups, setCheckingMockups] = useState(true)
  const [details, setDetails] = useState<ProductMetadata>(defaultProductMetadata)
  const [saving, setSaving] = useState(false)
  const [savedDetails, setSavedDetails] = useState<ProductMetadata | null>(null)
  const [exporting, setExporting] = useState(false)
  const [priceInput, setPriceInput] = useState('')
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
  const [checkingSlug, setCheckingSlug] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function loadArtwork() {
      if (!brand) {
        setError('Missing brand.')
        setLoading(false)
        return
      }

      try {
        const response = await fetch(
          `/api/artworks/${id}?brand=${encodeURIComponent(brand)}`
        )

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Unable to load artwork.')
        }

        setArtwork(result)

        const metadata = result.metadata ?? { ...defaultProductMetadata }

        const loadedDetails = {
          ...metadata,
          slug: metadata.slug || slugify(metadata.title)
        }

        setSlugManuallyEdited(
          Boolean(metadata.slug && metadata.slug !== slugify(metadata.title))
        )

        setDetails(loadedDetails)
        setPriceInput(String(loadedDetails.price))
        setSavedDetails(loadedDetails)

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

    loadArtwork()
  }, [id, brand])


  useEffect(() => {
    if (!artwork) return

    let cancelled = false

    const product = productCatalog.find(
      (item) => item.id === details.productType
    )

    if (!product) {
      setAvailableMockups([])
      setCheckingMockups(false)
      return
    }

    const colors = product.colors.filter(
      (color) => details.colors.includes(color.id)
    )

    async function checkMockups() {
      setCheckingMockups(true)

      const results = await Promise.all(
        colors.map(async (color) => {
          const url = new URL(
            `/api/mockups/${artwork!.id}`,
            window.location.origin
          )

          url.searchParams.set('brand', artwork!.brand)
          url.searchParams.set('productType', product!.id)
          url.searchParams.set('color', color.id)

          try {
            const response = await fetch(url.toString(), {
              method: 'HEAD',
              cache: 'no-store',
            })

            return response.ok ? color.id : null
          } catch {
            return null
          }
        })
      )

      if (!cancelled) {
        setAvailableMockups(
          results.filter((color): color is string => color !== null)
        )
        setCheckingMockups(false)
      }
    }

    checkMockups()

    return () => {
      cancelled = true
    }
  }, [artwork, details.productType, details.colors])


  useEffect(() => {
    if (!artwork) return

    const slug = details.slug

    if (!slug) {
      setSlugAvailable(null)
      setCheckingSlug(false)
      return
    }

    let cancelled = false

    setCheckingSlug(true)
    setSlugAvailable(null)

    const timeout = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          brand: artwork.brand,
          slug,
          artworkId: artwork.id,
        })

        const response = await fetch(
          `/api/slugs/check?${params.toString()}`,
          { cache: 'no-store' }
        )

        if (!response.ok) {
          throw new Error('Unable to check slug.')
        }

        const result: { available: boolean } = await response.json()

        if (!cancelled) {
          setSlugAvailable(result.available)
        }
      } catch {
        if (!cancelled) {
          setSlugAvailable(null)
        }
      } finally {
        if (!cancelled) {
          setCheckingSlug(false)
        }
      }
    }, 400)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [artwork, details.slug])

  async function handleGenerateMockup() {
    if (!artwork || generating || checkingMockups) return

    const product = productCatalog.find(
      (item) => item.id === details.productType
    )

    if (
      !product ||
      !details.colors.includes(selectedColor)
    ) {
      setError('Select a valid product color first.')
      return
    }

    setGenerating(true)
    setMessage('')
    setError('')

    try {
      const response = await fetch('/api/mockups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brand: artwork.brand,
          id: artwork.id,
          productType: product.id,
          color: selectedColor,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error || 'Unable to generate mockup.'
        )
      }

      setAvailableMockups((current) =>
        current.includes(selectedColor)
          ? current
          : [...current, selectedColor]
      )

      setMockupVersion(Date.now())
      setMessage('Mockup generated successfully!')
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Unable to generate mockup.'
      )
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <main className="p-12">
        Loading artwork...
      </main>
    )
  }

  if (error && !artwork) {
    return (
      <main className="p-12">
        <p className="text-red-700">{error}</p>
        <Link href="/library" className="mt-4 inline-block underline">
          Back to library
        </Link>
      </main>
    )
  }

  if (!artwork) return null

  const brandName = brands.find((item) => item.id === artwork.brand)?.name ?? artwork.brand

  async function handleSaveDetails() {
    if (!artwork || saving) return

    setSaving(true)
    setMessage('')
    setError('')

    try {
      const response = await fetch(
        `/api/artworks/${artwork.id}?brand=${artwork.brand}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(details)
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error || 'Unable to save product details.'
        )
      }

      setSavedDetails(details)
      setMessage('Product details saved successfully!')

    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Unable to save product details.'
      )
    } finally {
      setSaving(false)
    }
  }

  const hasUnsavedChanges =
    savedDetails !== null &&
    JSON.stringify(details) !== JSON.stringify(savedDetails)

  async function handleDelete() {
    if (!artwork || deleting) return

    const confirmed = window.confirm(
      'Are you sure you want to permanently delete this artwork and all its mockups? This cannot be undone.'
    )

    if (!confirmed) return

    setDeleting(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch(
        `/api/artworks/${artwork.id}?brand=${encodeURIComponent(artwork.brand)}`,
        { method: 'DELETE' }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Unable to delete artwork.')
      }

      router.replace('/library')
      router.refresh()
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Unable to delete artwork.'
      )
      setDeleting(false)
    }
  }

  async function handleExport() {
    if (!artwork || exporting || hasUnsavedChanges) return

    setExporting(true)
    setError('')
    setMessage('')

    try {
      const url = `/api/artworks/${artwork.id}/export?brand=${encodeURIComponent(artwork.brand)}`

      const response = await fetch(url)

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Unable to export product.')
      }

      const blob = await response.blob()
      const downloadUrl = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `${artwork.brand}-${details.slug}.zip`

      document.body.appendChild(link)
      link.click()
      link.remove()

      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)

      setMessage('Product ZIP downloaded successfully!')
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Unable to export product.'
      )
    } finally {
      setExporting(false)
    }
  }

  const selectedProduct = productCatalog.find(
    (product) => product.id === details.productType
  )

  const selectedColors = selectedProduct?.colors.filter(
    (color) => details.colors.includes(color.id)
  ) ?? []

  const activeColor = selectedColors.find(
    (color) => color.id === selectedColor
  ) ?? selectedColors[0]

  const activeColorId = activeColor?.id

  const hasActiveMockup = activeColorId
    ? availableMockups.includes(activeColorId)
    : false

  return (
    <main className="min-h-screen bg-[#F5F2EB] px-6 py-12 text-[#171717]">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/library"
          className="mb-8 inline-block text-sm font-medium text-neutral-600 hover:text-black"
        >
          ← Back to library
        </Link>

        <header className="mb-10 flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="mb-2 text-sm uppercase tracking-widest text-neutral-500">
              {brandName}
            </p>

            <h1 className="text-4xl font-bold">
              Artwork Details
            </h1>

            <p className="mt-3 text-neutral-600">
              Uploaded {new Date(artwork.createdAt).toLocaleDateString()}
            </p>
          </div>

          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || saving || generating || exporting}
            className="rounded-lg border border-red-200 px-5 py-3 text-sm font-semibold text-red-700 transition hover:border-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {deleting ? 'Deleting...' : 'Delete Artwork'}
          </button>
        </header>

        <div className="grid gap-8 md:grid-cols-2">
          <section className="rounded-2xl border border-neutral-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold">
              Original artwork
            </h2>

            <div className="relative aspect-square overflow-hidden rounded-xl bg-neutral-100">
              <Image
                src={`/api/artworks/${artwork.id}/image?brand=${artwork.brand}`}
                alt="Original artwork"
                fill
                unoptimized
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-contain p-6"
              />
            </div>
          </section>

          {/* Product Image Gallery */}
          <section className="rounded-2xl border border-neutral-200 bg-white p-6">
            <div className="mb-5">
              <h2 className="text-lg font-semibold">
                Product Image Gallery
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Preview and generate mockups for each selected color.
              </p>
            </div>

            {/* Main preview */}
            <div className="relative aspect-square overflow-hidden rounded-xl bg-[#F5F2EB]">
              {checkingMockups ? (
                <div className="flex h-full items-center justify-center text-sm text-neutral-500">
                  Checking mockups...
                </div>
              ) : hasActiveMockup && activeColorId ? (
                <Image
                  key={`${details.productType}-${activeColorId}-${mockupVersion}`}
                  src={`/api/mockups/${artwork.id}?brand=${artwork.brand}&productType=${details.productType}&color=${activeColorId}&v=${mockupVersion}`}
                  alt={`${activeColor?.name} ${selectedProduct?.name} mockup`}
                  fill
                  unoptimized
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-contain p-6"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-neutral-500">
                  <span className="text-4xl">👕</span>
                  <p className="text-sm">
                    No mockup generated for this color yet.
                  </p>
                </div>
              )}
            </div>

            {/* Color thumbnails */}
            <div className="mt-5">
              <p className="mb-3 text-sm font-medium">
                Product colors
              </p>

              <div className="flex flex-wrap gap-3">
                {selectedColors.map((color) => {
                  const isActive = activeColorId === color.id
                  const hasImage = availableMockups.includes(color.id)

                  return (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => {
                        setSelectedColor(color.id)
                        setMessage('')
                        setError('')
                      }}
                      disabled={generating}
                      aria-pressed={isActive}
                      className={`flex min-w-20 flex-col items-center gap-2 rounded-xl border p-3 transition ${
                        isActive
                          ? 'border-neutral-900 bg-neutral-100'
                          : 'border-neutral-200 hover:border-neutral-400'
                      } disabled:opacity-50`}
                    >
                      <span
                        className="h-9 w-9 rounded-full border border-neutral-300"
                        style={{ backgroundColor: color.hex }}
                      />

                      <span className="text-xs font-medium">
                        {color.name}
                      </span>

                      <span className={`text-[10px] ${
                        hasImage ? 'text-green-700' : 'text-neutral-400'
                      }`}>
                        {hasImage ? 'Ready' : 'Not generated'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Generate button */}
            <button
              type="button"
              onClick={handleGenerateMockup}
              disabled={generating || checkingMockups || !activeColorId}
              className="mt-6 w-full rounded-lg bg-neutral-900 px-5 py-3 font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-40"
            >
              {generating
                ? 'Generating...'
                : hasActiveMockup
                  ? `Regenerate ${activeColor?.name} mockup`
                  : `Generate ${activeColor?.name ?? ''} mockup`}
            </button>

            {message && (
              <p className="mt-3 text-sm text-green-700">
                {message}
              </p>
            )}

            {error && (
              <p className="mt-3 text-sm text-red-700">
                {error}
              </p>
            )}
          </section>
        </div>

        {/* Product Options */}
        <section className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">
              Product Options
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              Choose which products and colors this artwork will be available on.
            </p>
          </div>

          {/* Product type */}
          <div className="mb-8">
            <label
              htmlFor="product-type"
              className="mb-2 block text-sm font-medium"
            >
              Product type
            </label>

            <select
              id="product-type"
              value={details.productType}
              onChange={(event) => {
                const selected = productCatalog.find(
                  (product) => product.id === event.target.value
                )

                if (!selected) return

                setDetails((current) => ({
                  ...current,
                  productType: selected.id,
                  colors: selected.colors.length
                    ? [selected.colors[0].id]
                    : [],
                  sizes: current.sizes.filter((size) =>
                    selected.sizes.includes(size)
                  ),
                }))
              }}
              className="w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 md:max-w-sm"
            >
              {productCatalog.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          {/* Colors */}
          {productCatalog
            .filter((product) => product.id === details.productType)
            .map((product) => (
              <div key={product.id}>
                <p className="mb-3 text-sm font-medium">
                  Available colors
                </p>

                <div className="flex flex-wrap gap-4">
                  {product.colors.map((color) => {
                    const selected = details.colors.includes(color.id)

                    return (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => {
                          setDetails((current) => ({
                            ...current,
                            colors: selected
                              ? current.colors.length > 1
                                ? current.colors.filter(
                                    (id) => id !== color.id
                                  )
                                : current.colors
                              : [...current.colors, color.id],
                          }))
                        }}
                        aria-pressed={selected}
                        className="flex flex-col items-center gap-2"
                      >
                        <span
                          className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition ${
                            selected
                              ? 'border-neutral-900 ring-2 ring-neutral-300 ring-offset-2'
                              : 'border-neutral-300 hover:border-neutral-600'
                          }`}
                          style={{ backgroundColor: color.hex }}
                        >
                          {selected && (
                            <span className="text-lg font-bold text-white">
                              ✓
                            </span>
                          )}
                        </span>

                        <span className="text-sm text-neutral-600">
                          {color.name}
                        </span>
                      </button>
                    )
                  })}
                </div>

                <p className="mt-4 text-sm text-neutral-500">
                  {details.colors.length} color(s) selected
                </p>
              </div>
            ))}
        </section>

        {/* Product Detail */}
        <section className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">
              Product Details
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Prepare this artwork for your storefront.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <label
                htmlFor="product-title"
                className="mb-2 block text-sm font-medium"
              >
                Product name
              </label>

              <input
                id="product-title"
                type="text"
                maxLength={150}
                value={details.title}
                onChange={(event) => {
                  const title = event.target.value

                  setDetails((current) => ({
                    ...current,
                    title,
                    slug: slugManuallyEdited
                      ? current.slug
                      : slugify(title)
                  }))
                }}
                placeholder="Medusa: Making Men Hard Since 700 BC"
                className="w-full rounded-lg border border-neutral-300 px-4 py-3"
              />
            </div>

            {/* Slug */}
            <div className="md:col-span-2">
              <label
                htmlFor="product-slug"
                className="mb-2 block text-sm font-medium"
              >
                URL slug
              </label>

              <input
                id="product-slug"
                type="text"
                value={details.slug}
                maxLength={180}
                onChange={(event) => {
                  setSlugManuallyEdited(true)
                  setDetails((current) => ({
                    ...current,
                    slug: slugify(event.target.value),
                  }))
                }}
                placeholder="e.g. medusa-making-men-hard"
                className="w-full rounded-lg border border-neutral-300 px-4 py-3"
              />
              {details.slug && (
                <p
                  className={`mt-2 text-xs font-medium ${
                    checkingSlug
                      ? 'text-neutral-500'
                      : slugAvailable === true
                        ? 'text-green-700'
                        : slugAvailable === false
                          ? 'text-red-700'
                          : 'text-neutral-500'
                  }`}
                >
                  {checkingSlug
                    ? 'Checking slug availability...'
                    : slugAvailable === true
                      ? 'Slug is available'
                      : slugAvailable === false
                        ? 'This slug is already in use for this brand.'
                        : 'Slug availability could not be checked.'}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label
                htmlFor="product-description"
                className="mb-2 block text-sm font-medium"
              >
                Description
              </label>

              <textarea
                id="product-description"
                value={details.description}
                maxLength={5000}
                rows={5}
                onChange={(event) =>
                  setDetails((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Tell the story behind this design..."
                className="w-full rounded-lg border border-neutral-300 px-4 py-3"
              />
            </div>

            {/* Price */}
            <div>
              <label
                htmlFor="product-price"
                className="mb-2 block text-sm font-medium"
              >
                Price (€)
              </label>

              <input
                id="product-price"
                type="text"
                inputMode="decimal"
                value={priceInput}
                onChange={(event) => {
                  const value = event.target.value

                  // Allow numbers, a comma or a dot
                  if (!/^\d*([.,]\d{0,2})?$/.test(value)) return

                  setPriceInput(value)

                  setDetails((current) => ({
                    ...current,
                    price: Number(value.replace(',', '.')),
                  }))
                }}
                placeholder="e.g. 24,95 or 24.95"
                className="w-full rounded-lg border border-neutral-300 px-4 py-3"
              />
              <p className="mt-2 text-xs text-neutral-500">
                Use a comma or dot for decimals (e.g. 24,95 or 24.95).
              </p>
            </div>

            {/* Sizes */}
            <div className="md:col-span-2">
              <p className="mb-3 text-sm font-medium">
                Available sizes
              </p>

              <div className="flex flex-wrap gap-3">
                {(
                  productCatalog.find((product) => product.id === details.productType)?.sizes ?? []
                ).map((size) => (
                  <label
                    key={size}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={details.sizes.includes(size)}
                      onChange={(event) =>
                        setDetails((current) => ({
                          ...current,
                          sizes: event.target.checked
                            ? [...current.sizes, size]
                            : current.sizes.filter(
                                (item) => item !== size
                              ),
                        }))
                      }
                    />
                    {size}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="product-category"
                className="mb-2 block text-sm font-medium"
              >
                Category
              </label>

              <select
                id="product-category"
                value={details.category}
                onChange={(event) =>
                  setDetails((current) => ({
                    ...current,
                    category: event.target.value,
                  }))
                }
                className="w-full rounded-lg border border-neutral-300 bg-white px-4 py-3"
              >
                <option value="">Select a category</option>

                {productOptions[artwork.brand].categories.map(
                  (category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor="product-status"
                className="mb-2 block text-sm font-medium"
              >
                Status
              </label>

              <select
                id="product-status"
                value={details.status}
                onChange={(event) =>
                  setDetails((current) => ({
                    ...current,
                    status: event.target.value as ProductMetadata['status'],
                  }))
                }
                className="w-full rounded-lg border border-neutral-300 bg-white px-4 py-3"
              >
                <option value="draft">Draft</option>
                <option value="ready">Ready for export</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <p className="mb-3 text-sm font-medium">
                Collections
              </p>

              <div className="flex flex-wrap gap-4">
                {productOptions[artwork.brand].collections.map(
                  (collection) => (
                    <label
                      key={collection.id}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={details.collections.includes(collection.id)}
                        onChange={(event) => {
                          setDetails((current) => ({
                            ...current,
                            collections: event.target.checked
                              ? [...current.collections, collection.id]
                              : current.collections.filter(
                                  (id) => id !== collection.id
                                )
                          }))
                        }}
                      />

                      {collection.name}
                    </label>
                  )
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSaveDetails}
              disabled={
                saving ||
                checkingSlug ||
                (details.slug !== '' && slugAvailable !== true)
              }
              className="rounded-lg bg-neutral-900 px-6 py-3 font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-40"
            >
              {saving ? 'Saving...' : 'Save details'}
            </button>

            <button
              type="button"
              onClick={handleExport}
              disabled={
                exporting ||
                saving ||
                generating ||
                checkingSlug ||
                (details.slug !== '' && slugAvailable !== true) ||
                checkingMockups ||
                hasUnsavedChanges ||
                details.status !== 'ready' ||
                details.colors.length === 0 ||
                !details.colors.every((color) => availableMockups.includes(color))
              }
              className="rounded-lg bg-emerald-700 px-6 py-3 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {exporting ? 'Exporting...' : 'Export to Storefront'}
            </button>
          </div>

          {hasUnsavedChanges && (
            <p className="mt-3 text-sm font-medium text-amber-700">
              You have unsaved changes.
            </p>
          )}

          {message && (
            <p className="mt-3 text-sm text-green-700">
              {message}
            </p>
          )}

          {error && (
            <p className="mt-3 text-sm text-red-700">
              {error}
            </p>
          )}
        </section>
      </div>
    </main>
  )
}
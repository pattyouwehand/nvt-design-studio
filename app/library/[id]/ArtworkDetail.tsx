'use client'

import { use, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { brands, type BrandId } from '@/lib/brands'
import { productOptions } from '@/lib/productOptions'
import { defaultProductMetadata, type ProductMetadata } from '@/lib/productMetadataTypes'
import { slugify } from '@/lib/slugify'
import { productCatalog } from '@/lib/catalog/products'
import { Shirt, ChevronDown } from 'lucide-react'

interface LinkedProduct {
  id: string
  title: string
  slug: string
  productType: string
  status: 'draft' | 'ready'
  isPublished: boolean
  createdAt: string
}

interface ArtworkDetail {
  id: string
  brand: BrandId
  filename: string
  createdAt: string
  hasMockup: boolean
  metadata: ProductMetadata
  productId: string | null
  isPublished: boolean
  linkedProducts: LinkedProduct[]
}

export default function ArtworkDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const searchParams = useSearchParams()
  const brand = searchParams.get('brand')
  const selectedProductId = searchParams.get('productId')

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
  const [deletingProduct, setDeletingProduct] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [unpublishing, setUnpublishing] = useState(false)
  const [creatingProduct, setCreatingProduct] = useState(false)

  useEffect(() => {
  async function loadArtwork() {
    if (!brand) {
      setError('Missing brand.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const query = new URLSearchParams({ brand })

      if (selectedProductId) {
        query.set('productId', selectedProductId)
      }

      const response = await fetch(
        `/api/artworks/${id}?${query.toString()}`,
        { cache: 'no-store' }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Unable to load artwork.')
      }

      setArtwork(result)

      const metadata = result.metadata ?? defaultProductMetadata

      const loadedDetails: ProductMetadata = {
        ...defaultProductMetadata,
        ...metadata,
        slug: metadata.slug || slugify(metadata.title)
      }

      setSlugManuallyEdited(
        Boolean(metadata.slug && metadata.slug !== slugify(metadata.title))
      )

      setDetails(loadedDetails)
      setPriceInput(
        loadedDetails.price === 0 ? '' : String(loadedDetails.price)
      )
      setSavedDetails(loadedDetails)
      setSlugAvailable(null)

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
}, [id, brand, selectedProductId])

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
      const query = new URLSearchParams({
        brand: artwork.brand
      })

      if (artwork.productId) {
        query.set('productId', artwork.productId)
      }

      const response = await fetch(
        `/api/artworks/${artwork.id}?${query.toString()}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(details)
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error || 'Unable to save product details.'
        )
      }

      const artworkResponse = await fetch(
        `/api/artworks/${artwork.id}?${query.toString()}`,
        { cache: 'no-store' }
      )

      if (!artworkResponse.ok) {
        throw new Error('Product saved, but unable to refresh product data.')
      }

      const updatedArtwork: ArtworkDetail = await artworkResponse.json()

      setArtwork(updatedArtwork)
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

  const hasUnsavedChanges = savedDetails !== null && JSON.stringify(details) !== JSON.stringify(savedDetails)

  async function handleDeleteProduct() {
    if (!artwork?.productId || deletingProduct) return

    const confirmed = window.confirm(
      'Permanently delete this product?\n\n' +
      'It will also be removed from the storefront.\n' +
      'The original artwork and mockups will be preserved.'
    )

    if (!confirmed) return

    setDeletingProduct(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch(
        `/api/products/${artwork.productId}`,
        { method: 'DELETE' }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error || 'Unable to delete product.'
        )
      }

      const resetDetails = { ...defaultProductMetadata }

      setArtwork((current) =>
        current
          ? {
              ...current,
              productId: null,
              isPublished: false,
              metadata: resetDetails
            }
          : current
      )

      setDetails(resetDetails)
      setSavedDetails(resetDetails)
      setPriceInput('')
      setSlugManuallyEdited(false)
      setSlugAvailable(null)

      setMessage('Product deleted. Original artwork preserved!')
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Unable to delete product.'
      )
    } finally {
      setDeletingProduct(false)
    }
  }

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

  async function handlePublish() {
    if (
      !artwork?.productId ||
      publishing ||
      hasUnsavedChanges ||
      details.status !== 'ready'
    ) return

    setPublishing(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch(
        `/api/products/${artwork.productId}/publish`,
        { method: 'POST' }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Unable to publish product.')
      }

      setArtwork((current) =>
        current ? { ...current, isPublished: true } : current
      )

      setMessage('Product published successfully!')
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Unable to publish product.'
      )
    } finally {
      setPublishing(false)
    }
  }

  async function handleUnpublish() {
    if (!artwork?.productId || unpublishing) return

    const confirmed = window.confirm(
      'Remove this product from the storefront? Your Studio product and mockups will be preserved.'
    )

    if (!confirmed) return

    setUnpublishing(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch(
        `/api/products/${artwork.productId}/publish`,
        { method: 'DELETE' }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Unable to unpublish product.')
      }

      setArtwork((current) =>
        current ? { ...current, isPublished: false } : current
      )

      setMessage('Product unpublished successfully!')
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Unable to unpublish product.'
      )
    } finally {
      setUnpublishing(false)
    }
  }

  async function handleCreateProduct() {
    if (!artwork || creatingProduct) return

    if (hasUnsavedChanges) {
      setError('Save or discard your changes before creating a new product.')
      return
    }

    setCreatingProduct(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch(
        `/api/artworks/${artwork.id}/products?brand=${encodeURIComponent(artwork.brand)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productType: details.productType
          })
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Unable to create product.')
      }

      window.location.href =
        `/library/${artwork.id}?brand=${encodeURIComponent(artwork.brand)}&productId=${encodeURIComponent(result.productId)}`
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Unable to create product.'
      )
    } finally {
      setCreatingProduct(false)
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
                <div className="flex h-full flex-col items-center justify-center gap-3 text-neutral-500">
                  <Shirt size={36} strokeWidth={1.5} className="text-neutral-400" />
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

            <div className="relative w-full md:max-w-sm">
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
                    )
                  }))
                }}
                className="w-full appearance-none cursor-pointer rounded-lg border border-neutral-300 bg-white py-3 pl-5 pr-12 text-sm text-neutral-700 transition hover:border-neutral-400 focus:border-neutral-500 focus:outline-none"
              >
                {productCatalog.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>

              <ChevronDown
                size={18}
                strokeWidth={1.75}
                aria-hidden="true"
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500"
              />
            </div>
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

            {/* Subtitle */}
            <div className="md:col-span-2">
              <label
                htmlFor="product-subtitle"
                className="mb-2 block text-sm font-medium"
              >
                Subtitle
              </label>

              <input
                id="product-subtitle"
                type="text"
                maxLength={200}
                value={details.subtitle}
                onChange={(event) =>
                  setDetails((current) => ({
                    ...current,
                    subtitle: event.target.value
                  }))
                }
                placeholder="A little extra attitude..."
                className="w-full rounded-lg border border-neutral-300 px-4 py-3"
              />
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

            {/* Category */}
            <div>
              <label
                htmlFor="product-category"
                className="mb-2 block text-sm font-medium"
              >
                Category
              </label>

              <div className="relative w-full md:max-w-sm">
                <select
                  id="product-category"
                  value={details.category}
                  onChange={(event) =>
                    setDetails((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                  className="w-full appearance-none cursor-pointer rounded-lg border border-neutral-300 bg-white py-3 pl-5 pr-12 text-sm text-neutral-700 transition hover:border-neutral-400 focus:border-neutral-500 focus:outline-none"
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

                <ChevronDown
                  size={18}
                  strokeWidth={1.75}
                  aria-hidden="true"
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500"
                />
              </div>
            </div>

            {/* Label */}
            <div>
              <label
                htmlFor="product-label"
                className="mb-2 block text-sm font-medium"
              >
                Product label
              </label>

              <div className="relative w-full md:max-w-sm">
                <select
                  id="product-label"
                  value={details.label}
                  onChange={(event) =>
                    setDetails((current) => ({
                      ...current,
                      label: event.target.value
                    }))
                  }
                  className="w-full appearance-none cursor-pointer rounded-lg border border-neutral-300 bg-white py-3 pl-5 pr-12 text-sm text-neutral-700 transition hover:border-neutral-400 focus:border-neutral-500 focus:outline-none"
                >
                  <option value="">No label</option>

                  {productOptions[artwork.brand].labels.map((label) => (
                    <option key={label.id} value={label.id}>
                      {label.name}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  size={18}
                  strokeWidth={1.75}
                  aria-hidden="true"
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500"
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label
                htmlFor="product-status"
                className="mb-2 block text-sm font-medium"
              >
                Status
              </label>

              <div className="relative w-full md:max-w-sm">
                <select
                  id="product-status"
                  value={details.status}
                  onChange={(event) =>
                    setDetails((current) => ({
                      ...current,
                      status: event.target.value as ProductMetadata['status'],
                    }))
                  }
                  className="w-full appearance-none cursor-pointer rounded-lg border border-neutral-300 bg-white py-3 pl-5 pr-12 text-sm text-neutral-700 transition hover:border-neutral-400 focus:border-neutral-500 focus:outline-none"
                >
                  <option value="draft">Draft</option>
                  <option value="ready">Ready for export</option>
                </select>

                <ChevronDown
                  size={18}
                  strokeWidth={1.75}
                  aria-hidden="true"
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500"
                />
              </div>
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
              onClick={handlePublish}
              disabled={
                publishing ||
                unpublishing ||
                saving ||
                generating ||
                checkingSlug ||
                checkingMockups ||
                hasUnsavedChanges ||
                !artwork.productId ||
                details.status !== 'ready' ||
                !details.colors.every((color) =>
                  availableMockups.includes(color)
                )
              }
              className="rounded-lg bg-emerald-700 px-6 py-3 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {publishing
                ? 'Publishing...'
                : artwork.isPublished
                  ? 'Update Storefront'
                  : 'Publish to Storefront'}
            </button>

            {artwork.isPublished && (
              <button
                type="button"
                onClick={handleUnpublish}
                disabled={unpublishing || publishing || saving}
                className="rounded-lg border border-red-300 px-6 py-3 font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-40"
              >
                {unpublishing ? 'Unpublishing...' : 'Unpublish'}
              </button>
            )}

            {artwork.productId && (
              <button
                type="button"
                onClick={handleDeleteProduct}
                disabled={
                  deletingProduct ||
                  saving ||
                  publishing ||
                  unpublishing
                }
                className="rounded-lg border border-red-300 px-6 py-3 font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {deletingProduct ? 'Deleting product...' : 'Delete Product'}
              </button>
            )}

            <button
              type="button"
              onClick={handleExport}
              disabled={
                exporting ||
                saving ||
                generating ||
                hasUnsavedChanges ||
                details.status !== 'ready' ||
                checkingMockups ||
                !details.colors.every((color) =>
                  availableMockups.includes(color)
                )
              }
              className="rounded-lg border border-neutral-300 px-6 py-3 font-semibold text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-40"
            >
              {exporting ? 'Exporting...' : 'Download ZIP'}
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

        {/* Linked Products */}
        <section className="mt-8 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Linked Products</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Products using this artwork.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="rounded-full bg-neutral-100 px-3 py-1 text-sm font-medium text-neutral-700">
                {artwork.linkedProducts?.length ?? 0} products
              </span>

              <button
                type="button"
                onClick={handleCreateProduct}
                disabled={creatingProduct || saving || deletingProduct}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-40"
              >
                {creatingProduct ? 'Creating...' : '+ Create Product'}
              </button>
            </div>
          </div>

          {artwork.linkedProducts?.length ? (
            <div className="divide-y divide-neutral-200">
              {artwork.linkedProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => {
                    if (hasUnsavedChanges) {
                      const confirmed = window.confirm(
                        'You have unsaved changes. Discard them and open another product?'
                      )

                      if (!confirmed) return
                    }

                    window.location.href =
                      `/library/${artwork.id}?brand=${encodeURIComponent(artwork.brand)}&productId=${encodeURIComponent(product.id)}`
                  }}
                  className={`flex w-full flex-wrap items-center justify-between gap-4 py-4 text-left transition hover:bg-neutral-50 ${
                    product.id === artwork.productId ? 'bg-neutral-50' : ''
                  }`}
                >
                  <div>
                    <h3 className="font-semibold">
                      {product.title || 'Untitled product'}
                    </h3>

                    <p className="mt-1 text-sm text-neutral-500">
                      {product.productType}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        product.isPublished
                          ? 'bg-green-100 text-green-800'
                          : product.status === 'ready'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      {product.isPublished
                        ? 'Published'
                        : product.status === 'ready'
                          ? 'Ready'
                          : 'Draft'}
                    </span>

                    {product.id === artwork.productId && (
                      <span className="text-xs font-medium text-neutral-400">
                        Current product
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-500">
              No products linked to this artwork yet.
            </p>
          )}
        </section>
      </div>
    </main>
  )
}
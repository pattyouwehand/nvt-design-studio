'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { productCatalog } from '@/lib/catalog/products'
import { productOptions } from '@/lib/productOptions'
import { isBrandId, type BrandId } from '@/lib/brands'
import { defaultProductMetadata, type ProductMetadata } from '@/lib/productMetadataTypes'

type RecordData = {
  id: string
  artworkId: string
  brand: string
  isPublished: boolean
} & ProductMetadata

const field = 'w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-800 transition hover:border-neutral-400 focus:border-neutral-500 focus:outline-none disabled:opacity-50'
const selectField = `${field} appearance-none cursor-pointer pr-12`

const slugify = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

function SelectField({
  value,
  onChange,
  children,
  disabled
}: {
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <div className="relative">
      <select
        className={selectField}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {children}
      </select>

      <ChevronDown
        size={18}
        strokeWidth={1.75}
        aria-hidden="true"
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500"
      />
    </div>
  )
}

export default function ProductEditor({ id }: { id: string }) {
  const router = useRouter()
  const [record, setRecord] = useState<RecordData | null>(null)
  const [details, setDetails] = useState<ProductMetadata>(defaultProductMetadata)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [previewColor, setPreviewColor] = useState('black')
  const [mockupVersion, setMockupVersion] = useState(0)
  const [mockupExists, setMockupExists] = useState(false)
  const [checkingMockup, setCheckingMockup] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [slugEdited, setSlugEdited] = useState(false)
  const [priceInput, setPriceInput] = useState('')

  useEffect(() => {
    let active = true

    fetch(`/api/products/${id}`, { cache: 'no-store' })
      .then(async (r) => {
        const data = await r.json()

        if (!r.ok) {
          throw new Error(data.error || 'Unable to load product')
        }

        if (!active) return

        const p = data.product

        setRecord(p)

        setDetails({
          ...defaultProductMetadata,
          title: p.title,
          slug: p.slug,
          subtitle: p.subtitle ?? '',
          description: p.description ?? '',
          price: p.price ?? 0,
          sizes: Array.isArray(p.sizes) ? p.sizes : [],
          colors: Array.isArray(p.colors) ? p.colors : [],
          category: p.category,
          collections: Array.isArray(p.collections) ? p.collections : [],
          label: p.label,
          status: p.status === 'ready' ? 'ready' : 'draft',
          productType: p.productType,
        })

        setSlugEdited(
          Boolean(
            p.slug &&
              !/^draft(?:-|$)/i.test(p.slug) &&
              p.slug !== slugify(p.title || '')
          )
        )

        setPriceInput(
          p.price == null || Number(p.price) === 0
            ? ''
            : String(p.price)
        )

        setPreviewColor(
          Array.isArray(p.colors) && p.colors.length
            ? p.colors[0]
            : 'black'
        )

        setDirty(false)
      })
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [id])

  const type = useMemo(
    () => productCatalog.find((p) => p.id === details.productType),
    [details.productType]
  )

  const brand: BrandId | null =
    record && isBrandId(record.brand) ? record.brand : null

  const options = brand ? productOptions[brand] : null

  const update = <K extends keyof ProductMetadata>(
    key: K,
    value: ProductMetadata[K]
  ) => {
    setDetails((p) => ({ ...p, [key]: value }))
    setDirty(true)
    setMessage('')
  }

  const updateTitle = (title: string) => {
    setDetails((previous) => ({
      ...previous,
      title,
      slug: slugEdited ? previous.slug : slugify(title),
    }))

    setDirty(true)
    setMessage('')
  }

  const updatePrice = (value: string) => {
    setPriceInput(value)

    const normalized = value.replace(',', '.')

    if (
      normalized.trim() !== '' &&
      /^\d*(?:\.\d{0,2})?$/.test(normalized) &&
      Number.isFinite(Number(normalized))
    ) {
      update('price', Number(normalized))
    }
  }

  const previewUrl =
    record && brand
      ? `/api/mockups/${record.artworkId}?brand=${brand}&productType=${encodeURIComponent(details.productType)}&color=${encodeURIComponent(previewColor)}&v=${mockupVersion}`
      : ''

  useEffect(() => {
    if (
      !record ||
      !brand ||
      !type?.colors.some((c) => c.id === previewColor)
    ) {
      setMockupExists(false)
      return
    }

    let active = true

    setCheckingMockup(true)

    fetch(previewUrl, {
      method: 'HEAD',
      cache: 'no-store',
    })
      .then((r) => {
        if (active) setMockupExists(r.ok)
      })
      .catch(() => {
        if (active) setMockupExists(false)
      })
      .finally(() => {
        if (active) setCheckingMockup(false)
      })

    return () => {
      active = false
    }
  }, [previewUrl, record, brand, type, previewColor])

  async function action(fn: () => Promise<void>) {
    setBusy(true)
    setError('')
    setMessage('')

    try {
      await fn()
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Something went wrong'
      )
    } finally {
      setBusy(false)
    }
  }

  async function json(
    url: string,
    method: string,
    body?: unknown
  ) {
    const response = await fetch(url, {
      method,
      headers:
        body === undefined
          ? undefined
          : { 'Content-Type': 'application/json' },
      body:
        body === undefined
          ? undefined
          : JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.error || `Request failed (${response.status})`
      )
    }

    return data
  }

  async function save() {
    if (
      !priceInput.trim() ||
      !/^\d+(?:[.,]\d{0,2})?$/.test(priceInput) ||
      !details.slug.trim()
    ) {
      setError('Enter a valid price and slug before saving.')
      return
    }

    await action(async () => {
      const data = await json(
        `/api/products/${id}`,
        'PATCH',
        details
      )

      setRecord((r) =>
        r ? { ...r, ...data.product } : r
      )

      setDirty(false)
      setMessage('Product saved')
    })
  }

  async function generate() {
    if (!record || !brand) return

    await action(async () => {
      await json('/api/mockups', 'POST', {
        brand,
        id: record.artworkId,
        productType: details.productType,
        color: previewColor,
      })

      setMockupVersion((n) => n + 1)
      setMessage('Mockup generated')
    })
  }

  async function publish() {
    if (dirty) {
      setError('Save your changes before publishing')
      return
    }

    await action(async () => {
      await json(`/api/products/${id}/publish`, 'POST')

      setRecord((r) =>
        r ? { ...r, isPublished: true } : r
      )

      setMessage('Product published')
    })
  }

  async function unpublish() {
    await action(async () => {
      await json(`/api/products/${id}/publish`, 'DELETE')

      setRecord((r) =>
        r ? { ...r, isPublished: false } : r
      )

      setMessage('Product unpublished')
    })
  }

  async function remove() {
    if (
      !window.confirm(
        'Permanently delete this product? The artwork will remain.'
      )
    ) {
      return
    }

    await action(async () => {
      await json(`/api/products/${id}`, 'DELETE')

      router.push('/products')
      router.refresh()
    })
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl p-8">
        Loading product...
      </main>
    )
  }

  if (!record || !brand || !options) {
    return (
      <main className="mx-auto max-w-6xl p-8">
        <Link href="/products">← Products</Link>

        <p className="mt-5 text-red-700">
          {error || 'Product not found'}
        </p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#F5F2EB] px-5 py-10 text-[#171717]">
      <div className="mx-auto max-w-7xl space-y-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/products"
              className="text-sm font-medium text-neutral-500 hover:text-neutral-900"
            >
              ← Product Library
            </Link>

            <h1 className="mt-2 text-3xl font-bold">
              {details.title || 'Untitled product'}
            </h1>

            <p className="text-sm text-neutral-500">
              {brand} · {record.isPublished ? 'Published' : details.status}
            </p>
          </div>

          <Link
            href={`/library/${record.artworkId}?brand=${brand}`}
            className="rounded-lg border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold transition hover:bg-neutral-50"
          >
            View artwork
          </Link>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 p-3 text-red-700"
          >
            {error}
          </p>
        )}

        {message && (
          <p
            role="status"
            className="rounded-lg bg-green-50 p-3 text-green-800"
          >
            {message}
          </p>
        )}

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-8">
            <h2 className="text-xl font-semibold">
              Product details
            </h2>

            <label className="block space-y-1 text-sm">
              Title
              <input
                className={field}
                maxLength={150}
                value={details.title}
                onChange={(e) => updateTitle(e.target.value)}
              />
            </label>

            <label className="block space-y-1 text-sm">
              Slug
              <input
                className={field}
                maxLength={180}
                value={details.slug}
                onChange={(e) => {
                  setSlugEdited(true)
                  update('slug', slugify(e.target.value))
                }}
              />
            </label>

            <label className="block space-y-1 text-sm">
              Subtitle
              <input
                className={field}
                value={details.subtitle}
                onChange={(e) => update('subtitle', e.target.value)}
              />
            </label>

            <label className="block space-y-1 text-sm">
              Description
              <textarea
                className={field}
                rows={5}
                maxLength={5000}
                value={details.description}
                onChange={(e) =>
                  update('description', e.target.value)
                }
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1 text-sm">
                Price (€)
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 24.95"
                  className={field}
                  value={priceInput}
                  onChange={(e) => updatePrice(e.target.value)}
                  onBlur={() => {
                    if (
                      priceInput.trim() &&
                      /^\d+(?:[.,]\d{0,2})?$/.test(priceInput)
                    ) {
                      setPriceInput(
                        String(
                          Number(priceInput.replace(',', '.'))
                        )
                      )
                    }
                  }}
                />
              </label>

              <label className="block space-y-1 text-sm">
                Status
                <SelectField
                  value={details.status}
                  onChange={(value) =>
                    update(
                      'status',
                      value as ProductMetadata['status']
                    )
                  }
                >
                  <option value="draft">Draft</option>
                  <option value="ready">Ready</option>
                </SelectField>
              </label>
            </div>

            <label className="block space-y-1 text-sm">
              Product type
              <SelectField
                value={details.productType}
                onChange={(value) => {
                  const next = productCatalog.find(
                    (p) => p.id === value
                  )

                  setDetails((p) => ({
                    ...p,
                    productType: value,
                    sizes: [],
                    colors: next?.colors[0]
                      ? [next.colors[0].id]
                      : [],
                  }))

                  setPreviewColor(
                    next?.colors[0]?.id ?? 'black'
                  )

                  setDirty(true)
                }}
              >
                {productCatalog.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </SelectField>
            </label>

            <div>
              <p className="mb-2 text-sm font-medium">
                Sizes
              </p>

              <div className="flex flex-wrap gap-3">
                {type?.sizes.map((s) => (
                  <label key={s} className="text-sm">
                    <input
                      type="checkbox"
                      className="mr-1"
                      checked={details.sizes.includes(s)}
                      onChange={(e) =>
                        update(
                          'sizes',
                          e.target.checked
                            ? [...details.sizes, s]
                            : details.sizes.filter(
                                (v) => v !== s
                              )
                        )
                      }
                    />
                    {s}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">
                Colors
              </p>

              <div className="flex flex-wrap gap-3">
                {type?.colors.map((c) => (
                  <label key={c.id} className="text-sm">
                    <input
                      type="checkbox"
                      className="mr-1"
                      checked={details.colors.includes(c.id)}
                      onChange={(e) => {
                        update(
                          'colors',
                          e.target.checked
                            ? [...details.colors, c.id]
                            : details.colors.filter(
                                (v) => v !== c.id
                              )
                        )

                        setPreviewColor(c.id)
                      }}
                    />
                    {c.name}
                  </label>
                ))}
              </div>
            </div>

            <label className="block space-y-1 text-sm">
              Category
              <SelectField
                value={details.category}
                onChange={(value) =>
                  update('category', value)
                }
              >
                <option value="">None</option>

                {options.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </SelectField>
            </label>

            <div>
              <p className="mb-2 text-sm font-medium">
                Collections
              </p>

              <div className="grid gap-2 sm:grid-cols-2">
                {options.collections.map((c) => (
                  <label key={c.id} className="text-sm">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={details.collections.includes(c.id)}
                      onChange={(e) =>
                        update(
                          'collections',
                          e.target.checked
                            ? [...details.collections, c.id]
                            : details.collections.filter(
                                (v) => v !== c.id
                              )
                        )
                      }
                    />
                    {c.name}
                  </label>
                ))}
              </div>
            </div>

            <label className="block space-y-1 text-sm">
              Label
              <SelectField
                value={details.label}
                onChange={(value) =>
                  update('label', value)
                }
              >
                <option value="">None</option>

                {options.labels.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </SelectField>
            </label>

            <div className="flex flex-wrap gap-3 border-t pt-5">
              <button
                disabled={busy}
                onClick={save}
                className="rounded-lg bg-neutral-900 px-5 py-3 font-semibold text-white disabled:opacity-50"
              >
                {busy ? 'Working...' : 'Save details'}
              </button>

              {record.isPublished ? (
                <button
                  disabled={busy}
                  onClick={unpublish}
                  className="rounded-lg border px-5 py-3 disabled:opacity-50"
                >
                  Unpublish
                </button>
              ) : (
                <button
                  disabled={busy || dirty}
                  onClick={publish}
                  className="rounded-lg border px-5 py-3 disabled:opacity-50"
                >
                  Publish
                </button>
              )}
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-2xl border border-neutral-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold">
                Mockup
              </h2>

              <SelectField
                value={previewColor}
                onChange={setPreviewColor}
              >
                {type?.colors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </SelectField>

              <div className="mt-4 flex aspect-[5/6] items-center justify-center overflow-hidden rounded-xl bg-neutral-100">
                {mockupExists ? (
                  <img
                    src={previewUrl}
                    alt="Product mockup"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="text-sm text-neutral-500">
                    {checkingMockup
                      ? 'Checking...'
                      : 'No mockup yet'}
                  </span>
                )}
              </div>

              <button
                disabled={
                  busy ||
                  !type?.colors.some(
                    (c) => c.id === previewColor
                  )
                }
                onClick={generate}
                className="mt-4 w-full rounded-lg bg-neutral-900 px-4 py-3 text-white disabled:opacity-50"
              >
                Generate mockup
              </button>

              <p className="mt-2 text-xs text-neutral-500">
                Mockups are shared by artwork, product type and color.
              </p>
            </section>

            <button
              disabled={busy}
              onClick={remove}
              className="w-full rounded-lg border border-red-200 p-3 text-red-700 disabled:opacity-50"
            >
              Delete product
            </button>
          </aside>
        </div>
      </div>
    </main>
  )
}
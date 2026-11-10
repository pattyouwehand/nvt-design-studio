'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Pencil, RefreshCw, Trash2 } from 'lucide-react'

interface SharedImage {
  id: string
  name: string
  storagePath: string
  productType: string | null
  color: string | null
  createdAt: string
}

interface EditForm {
  name: string
  productType: string
  color: string
}

const MAX_FILE_SIZE = 15 * 1024 * 1024
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

export default function SharedImageLibrary() {
  const [images, setImages] = useState<SharedImage[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [replacing, setReplacing] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [productType, setProductType] = useState('')
  const [color, setColor] = useState('')
  const [filter, setFilter] = useState('all')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({
    name: '',
    productType: '',
    color: ''
  })

  const [replacingId, setReplacingId] = useState<string | null>(null)
  const [replacementFile, setReplacementFile] = useState<File | null>(null)
  const [replacementPreview, setReplacementPreview] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    async function loadImages() {
      try {
        const response = await fetch('/api/shared-images', {
          cache: 'no-store'
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Unable to load images.')
        }

        setImages(result.images)
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : 'Unable to load images.'
        )
      } finally {
        setLoading(false)
      }
    }

    void loadImages()
  }, [])

  useEffect(() => {
    if (!replacementFile) {
      setReplacementPreview(null)
      return
    }

    const previewUrl = URL.createObjectURL(replacementFile)
    setReplacementPreview(previewUrl)

    return () => {
      URL.revokeObjectURL(previewUrl)
    }
  }, [replacementFile])

  const productTypes = useMemo(() => {
    return [...new Set(
      images
        .map((image) => image.productType)
        .filter((value): value is string => Boolean(value))
    )].sort()
  }, [images])

  const filteredImages = useMemo(() => {
    return images.filter(
      (image) =>
        filter === 'all' ||
        image.productType === filter
    )
  }, [images, filter])

  function startEditing(image: SharedImage) {
    if (replacing || saving) return

    cancelReplacing()
    setEditingId(image.id)
    setEditForm({
      name: image.name,
      productType: image.productType ?? '',
      color: image.color ?? ''
    })
    setError('')
    setMessage('')
  }

  function cancelEditing() {
    setEditingId(null)
    setEditForm({
      name: '',
      productType: '',
      color: ''
    })
  }

  async function handleSave(id: string) {
    if (!editForm.name.trim() || saving) return

    setSaving(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch(`/api/shared-images/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editForm.name.trim(),
          productType: editForm.productType.trim() || null,
          color: editForm.color.trim() || null
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Unable to update image.')
      }

      setImages((current) =>
        current.map((image) =>
          image.id === id ? result.image : image
        )
      )

      cancelEditing()
      setMessage('Image updated successfully!')
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Unable to update image.'
      )
    } finally {
      setSaving(false)
    }
  }

  function startReplacing(image: SharedImage) {
    if (saving || replacing) return

    cancelEditing()
    setReplacingId(image.id)
    setReplacementFile(null)
    setError('')
    setMessage('')
  }

  function cancelReplacing() {
    setReplacingId(null)
    setReplacementFile(null)
  }

  function handleReplacementFile(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null

    if (!selectedFile) {
      setReplacementFile(null)
      return
    }

    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      setError('Only PNG, JPEG and WebP images are allowed.')
      setReplacementFile(null)
      event.target.value = ''
      return
    }

    if (selectedFile.size === 0 || selectedFile.size > MAX_FILE_SIZE) {
      setError('Image must be smaller than 15 MB.')
      setReplacementFile(null)
      event.target.value = ''
      return
    }

    setError('')
    setMessage('')
    setReplacementFile(selectedFile)
  }

  async function handleReplace(id: string) {
    if (!replacementFile || replacing) return

    setReplacing(true)
    setError('')
    setMessage('')

    try {
      const formData = new FormData()
      formData.append('image', replacementFile)

      const response = await fetch(`/api/shared-images/${id}`, {
        method: 'PUT',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Unable to replace image.')
      }

      setImages((current) =>
        current.map((image) =>
          image.id === id ? result.image : image
        )
      )

      cancelReplacing()
      setMessage('Image replaced successfully!')
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Unable to replace image.'
      )
    } finally {
      setReplacing(false)
    }
  }

  async function handleDelete(image: SharedImage) {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${image.name}"?\n\nThis action cannot be undone.`
    )

    if (!confirmed) return

    setDeletingId(image.id)
    setError('')
    setMessage('')

    try {
      const response = await fetch(`/api/shared-images/${image.id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Unable to delete image.')
      }

      setImages((current) =>
        current.filter((item) => item.id !== image.id)
      )

      setMessage(
        result.warning || 'Image deleted successfully!'
      )
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Unable to delete image.'
      )
    } finally {
      setDeletingId(null)
    }
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!file || !name.trim()) return

    setUploading(true)
    setError('')
    setMessage('')

    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('name', name.trim())
      formData.append('productType', productType.trim())
      formData.append('color', color.trim())

      const response = await fetch('/api/shared-images', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Unable to upload image.')
      }

      setImages((current) => [result.image, ...current])

      setFile(null)
      setName('')
      setProductType('')
      setColor('')
      setMessage('Image uploaded successfully!')

      const fileInput = document.getElementById(
        'shared-image-file'
      ) as HTMLInputElement | null

      if (fileInput) fileInput.value = ''
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Unable to upload image.'
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#F5F2EB] px-6 py-12 text-[#171717]">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="mb-2 text-sm font-medium uppercase tracking-widest text-neutral-500">
              NVT Design Studio
            </p>

            <h1 className="text-4xl font-bold">
              Shared Image Library
            </h1>

            <p className="mt-3 text-neutral-600">
              Manage reusable product photos for your storefronts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/library"
              className="rounded-lg border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold transition hover:bg-neutral-100"
            >
              Artwork Library
            </Link>
          </div>
        </header>

        {/* Overview */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <p className="text-sm text-neutral-500">
              Total images
            </p>
            <p className="mt-2 text-3xl font-bold">
              {images.length}
            </p>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <p className="text-sm text-neutral-500">
              Product types
            </p>
            <p className="mt-2 text-3xl font-bold">
              {productTypes.length}
            </p>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <p className="text-sm text-neutral-500">
              Showing
            </p>
            <p className="mt-2 text-3xl font-bold">
              {filteredImages.length}
            </p>
          </div>
        </div>

        {/* Upload */}
        <section className="mb-10 rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="text-xl font-bold">
            Upload shared image
          </h2>

          <p className="mt-2 text-sm text-neutral-500">
            Upload PNG, JPEG or WebP. Images are automatically optimized to WebP.
          </p>

          <form
            onSubmit={handleUpload}
            className="mt-6 grid gap-4 md:grid-cols-2"
          >
            <label className="block text-sm font-medium">
              Image
              <input
                id="shared-image-file"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                required
                onChange={(event) => {
                  const selectedFile = event.target.files?.[0] ?? null
                  setFile(selectedFile)

                  if (selectedFile && !name) {
                    setName(selectedFile.name.replace(/\.[^.]+$/, ''))
                  }
                }}
                className="mt-2 block w-full rounded-lg border border-neutral-300 p-3 text-sm"
              />
            </label>

            <label className="block text-sm font-medium">
              Image name
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={150}
                required
                placeholder="Black T-shirt back"
                className="mt-2 w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm"
              />
            </label>

            <label className="block text-sm font-medium">
              Product type (optional)
              <input
                type="text"
                value={productType}
                onChange={(event) => setProductType(event.target.value)}
                maxLength={100}
                placeholder="t-shirt"
                className="mt-2 w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm"
              />
            </label>

            <label className="block text-sm font-medium">
              Color (optional)
              <input
                type="text"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                maxLength={100}
                placeholder="black"
                className="mt-2 w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm"
              />
            </label>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={uploading || !file || !name.trim()}
                className="rounded-lg bg-neutral-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : '+ Upload image'}
              </button>
            </div>
          </form>
        </section>

        {message && (
          <p role="status" className="mb-6 text-sm text-green-700">
            {message}
          </p>
        )}

        {error && (
          <p role="alert" className="mb-6 text-sm text-red-700">
            {error}
          </p>
        )}

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-bold">
            Your images
          </h2>

          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="rounded-lg border border-neutral-300 bg-white px-4 py-3 text-sm"
          >
            <option value="all">All product types</option>

            {productTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {loading && (
          <p className="text-neutral-500">
            Loading images...
          </p>
        )}

        {!loading && filteredImages.length === 0 && (
          <div className="rounded-xl border border-neutral-200 bg-white p-12 text-center">
            <h3 className="text-lg font-semibold">
              No images found
            </h3>

            <p className="mt-2 text-neutral-500">
              Upload your first shared product image.
            </p>
          </div>
        )}

        {/* Image grid */}
        {!loading && filteredImages.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredImages.map((image) => (
              <div
                key={image.id}
                className="overflow-hidden rounded-xl border border-neutral-200 bg-white"
              >
                <div className="relative aspect-square bg-neutral-100">
                  <Image
                    src={`/api/shared-images/${image.id}/image?v=${encodeURIComponent(image.storagePath)}`}
                    alt={image.name}
                    fill
                    unoptimized
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-contain p-4"
                  />
                </div>

                <div className="p-5">
                  {editingId === image.id ? (
                    <div className="space-y-4">
                      <label className="block text-sm font-medium">
                        Image name
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(event) =>
                            setEditForm((current) => ({
                              ...current,
                              name: event.target.value
                            }))
                          }
                          maxLength={150}
                          className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                        />
                      </label>

                      <label className="block text-sm font-medium">
                        Product type
                        <input
                          type="text"
                          value={editForm.productType}
                          onChange={(event) =>
                            setEditForm((current) => ({
                              ...current,
                              productType: event.target.value
                            }))
                          }
                          maxLength={100}
                          placeholder="fabric"
                          className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                        />
                      </label>

                      <label className="block text-sm font-medium">
                        Color
                        <input
                          type="text"
                          value={editForm.color}
                          onChange={(event) =>
                            setEditForm((current) => ({
                              ...current,
                              color: event.target.value
                            }))
                          }
                          maxLength={100}
                          placeholder="black"
                          className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                        />
                      </label>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void handleSave(image.id)}
                          disabled={saving || !editForm.name.trim()}
                          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-50"
                        >
                          {saving ? 'Saving...' : 'Save changes'}
                        </button>

                        <button
                          type="button"
                          onClick={cancelEditing}
                          disabled={saving}
                          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold transition hover:bg-neutral-100 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : replacingId === image.id ? (
                    <div className="space-y-4">
                      <h3 className="font-semibold">
                        Replace image
                      </h3>

                      <p className="text-sm text-neutral-500">
                        Choose a new image for {image.name}.
                        Existing product links will be preserved.
                      </p>

                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleReplacementFile}
                        disabled={replacing}
                        className="block w-full rounded-lg border border-neutral-300 p-2 text-sm"
                      />

                      {replacementPreview && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-neutral-500">
                            New image preview
                          </p>

                          <div className="relative aspect-square overflow-hidden rounded-lg bg-neutral-100">
                            <Image
                              src={replacementPreview}
                              alt="Replacement preview"
                              fill
                              unoptimized
                              sizes="300px"
                              className="object-contain p-3"
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void handleReplace(image.id)}
                          disabled={!replacementFile || replacing}
                          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {replacing ? 'Replacing...' : 'Replace image'}
                        </button>

                        <button
                          type="button"
                          onClick={cancelReplacing}
                          disabled={replacing}
                          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold transition hover:bg-neutral-100 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="min-w-0 flex-1 wrap-break-word font-semibold">
                          {image.name}
                        </h3>

                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => startEditing(image)}
                            disabled={saving || replacing || deletingId !== null}
                            title="Edit image"
                            aria-label={`Edit ${image.name}`}
                            className="rounded-lg p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-50"
                          >
                            <Pencil size={17} />
                          </button>

                          <button
                            type="button"
                            onClick={() => startReplacing(image)}
                            disabled={saving || replacing || deletingId !== null}
                            title="Replace image"
                            aria-label={`Replace ${image.name}`}
                            className="rounded-lg p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-50"
                          >
                            <RefreshCw size={17} />
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleDelete(image)}
                            disabled={saving || replacing || deletingId !== null}
                            title="Delete image"
                            aria-label={`Delete ${image.name}`}
                            className="rounded-lg p-2 text-neutral-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {image.productType && (
                          <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600">
                            {image.productType}
                          </span>
                        )}

                        {image.color && (
                          <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600">
                            {image.color}
                          </span>
                        )}
                      </div>

                      <p className="mt-4 text-xs text-neutral-400">
                        {new Date(image.createdAt).toLocaleDateString('en-GB')}
                      </p>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
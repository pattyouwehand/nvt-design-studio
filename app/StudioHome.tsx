'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { brands, type BrandId } from '@/lib/brands'

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [brand, setBrand] = useState<BrandId>('legends')
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!file) {
      setPreview(null)
      return
    }

    const url = URL.createObjectURL(file)
    setPreview(url)

    return () => URL.revokeObjectURL(url)
  }, [file])

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0]

    if (!selectedFile) return

    if (selectedFile.type !== 'image/png') {
      setMessage('Please upload a PNG file.')
      event.target.value = ''
      return
    }

    setFile(selectedFile)
    setSaved(false)
    setMessage('')
  }

  async function handleUpload() {
    if (!file || uploading || saved) return

    setUploading(true)
    setMessage('')

    try {
      const formData = new FormData()
      formData.append('artwork', file)
      formData.append('brand', brand)

      const response = await fetch('/api/artworks', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed.')
      }

      setSaved(true)
      setMessage(
        `Artwork saved successfully! (${result.artwork.width} × ${result.artwork.height})`
      )
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Upload failed.'
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
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.3em] text-neutral-500">
              NVT Company
            </p>

            <h1 className="text-4xl font-bold tracking-tight">
              Design Studio
            </h1>
          </div>

          <Link
            href="/library"
            className="rounded-lg bg-neutral-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-700"
          >
            View artwork library →
          </Link>
        </header>

        <div className="grid gap-8 md:grid-cols-2">
          <section className="rounded-2xl border border-neutral-200 bg-white p-8">
            <h2 className="mb-6 text-xl font-semibold">
              Upload artwork
            </h2>

            <label className="flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 p-6 text-center transition hover:border-neutral-500">
              <span className="mb-3 text-4xl">↑</span>

              <span className="font-medium">
                Choose your artwork
              </span>

              <span className="mt-2 text-sm text-neutral-500">
                Transparent PNG recommended
              </span>

              <input
                type="file"
                accept="image/png"
                disabled={uploading}
                onChange={handleFileChange}
                className="sr-only"
              />
            </label>

            {file && (
              <div className="mt-5 text-sm">
                <p className="font-medium">{file.name}</p>
                <p className="text-neutral-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}

            <div className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="brand"
                  className="mb-2 block text-sm font-medium"
                >
                  Brand
                </label>

                <div className="relative">
                  <select
                    id="brand"
                    value={brand}
                    disabled={uploading}
                    onChange={(event) => {
                      setBrand(event.target.value as BrandId)
                      setSaved(false)
                      setMessage('')
                    }}
                    className="w-full appearance-none cursor-pointer rounded-lg border border-neutral-300 bg-white py-3 pl-5 pr-12 text-sm text-neutral-700 transition hover:border-neutral-400 focus:border-neutral-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {brands.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
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

              <button
                type="button"
                onClick={handleUpload}
                disabled={!file || uploading || saved}
                className="w-full rounded-lg bg-neutral-900 px-5 py-3 font-semibold text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {uploading
                  ? 'Uploading...'
                  : saved
                    ? 'Artwork saved'
                    : 'Save artwork'}
              </button>

              {message && (
                <p role="status" className="text-sm text-neutral-600">
                  {message}
                </p>
              )}

              {saved && (
                <Link
                  href="/library"
                  className="block text-center text-sm font-semibold text-neutral-900 underline underline-offset-4 hover:text-neutral-600"
                >
                  View artwork in library →
                </Link>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-8">
            <h2 className="mb-6 text-xl font-semibold">
              Preview
            </h2>

            <div className="flex min-h-96 items-center justify-center overflow-hidden rounded-xl bg-neutral-100 p-8">
              {preview ? (
                <Image
                  src={preview}
                  alt="Artwork preview"
                  width={500}
                  height={500}
                  unoptimized
                  className="max-h-96 w-auto max-w-full object-contain"
                />
              ) : (
                <p className="text-sm text-neutral-500">
                  Your artwork will appear here.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
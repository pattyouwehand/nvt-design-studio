'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { brands, type BrandId } from '@/lib/brands'
import Link from 'next/link'
import SignOutButton from '@/components/SignOutButton'

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [brand, setBrand] = useState<BrandId>('legends')
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [artworkId, setArtworkId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [mockupUrl, setMockupUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setPreview(null)
      return
    }

    const url = URL.createObjectURL(file)
    setPreview(url)

    return () => URL.revokeObjectURL(url)
  }, [file])

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile = event.target.files?.[0]

    if (!selectedFile) return

    if (selectedFile.type !== 'image/png') {
      alert('Please upload a PNG file.')
      return
    }
    setArtworkId(null)
    setMockupUrl(null)
    setMessage('')
    setFile(selectedFile)
  }

  async function handleUpload() {
    if (!file || uploading || generating) return

    setUploading(true)
    setMessage('')
    setArtworkId(null)
    setMockupUrl(null)

    try {
      const formData = new FormData()
      formData.append('artwork', file)
      formData.append('brand', brand)

      const response = await fetch('/api/artworks', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed.')
      }

      setArtworkId(result.id)
      setMessage(`Artwork saved successfully! (${result.width} × ${result.height})`)

    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  async function handleGenerateMockup() {
    if (!artworkId || generating) return

    setGenerating(true)
    setMessage('')

    try {
      const response = await fetch('/api/mockups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brand,
          id: artworkId,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.error || 'Mockup generation failed.'
        )
      }

      setMockupUrl(`/api/mockups/${artworkId}?brand=${brand}&v=${Date.now()}`)
      setMessage('Mockup generated successfully!')

    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Mockup generation failed.'
      )
    } finally {
      setGenerating(false)
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
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/library"
              className="rounded-lg bg-neutral-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-700"
            >
              View artwork library →
            </Link>

            <SignOutButton />
          </div>
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
                Transparent background and PNG recommended
              </span>

              <input
                type="file"
                accept="image/png"
                disabled={uploading || generating}
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

                <select
                  id="brand"
                  value={brand}
                  disabled={uploading || generating}
                  onChange={(event) => {
                    setBrand(event.target.value as BrandId)
                    setArtworkId(null)
                    setMockupUrl(null)
                    setMessage('')
                  }}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-4 py-3"
                >
                  {brands.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleUpload}
                disabled={!file || uploading || generating}
                className="w-full rounded-lg bg-neutral-900 px-5 py-3 font-semibold text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {uploading ? 'Uploading...' : 'Save artwork'}
              </button>

              <button
                type="button"
                onClick={handleGenerateMockup}
                disabled={!artworkId || generating || uploading}
                className="w-full rounded-lg bg-[#171717] px-5 py-3 font-semibold text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {generating ? 'Generating...' : 'Generate mockup'}
              </button>

              {message && (
                <p role="status" className="text-sm text-neutral-600">
                  {message}
                </p>
              )}
            </div>
          </section>
          <section className="rounded-2xl border border-neutral-200 bg-white p-8">
            <h2 className="mb-6 text-xl font-semibold">
              Preview
            </h2>

            <div className="grid gap-6">
              <div>
                <h3 className="mb-3 text-sm font-medium">
                  Original artwork
                </h3>

                <div className="flex min-h-64 items-center justify-center overflow-hidden rounded-xl bg-neutral-100 p-6">
                  {preview ? (
                    <Image
                      src={preview}
                      alt="Artwork preview"
                      width={400}
                      height={400}
                      unoptimized
                      className="max-h-64 w-auto object-contain"
                    />
                  ) : (
                    <p className="text-sm text-neutral-500">
                      Your artwork will appear here.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-medium">
                  Generated mockup
                </h3>

                <div className="flex min-h-80 items-center justify-center overflow-hidden rounded-xl bg-[#F5F2EB] p-6">
                  {mockupUrl ? (
                    <Image
                      src={mockupUrl}
                      alt="Generated shirt mockup"
                      width={500}
                      height={600}
                      unoptimized
                      className="h-auto max-h-96 w-auto object-contain"
                    />
                  ) : (
                    <p className="text-sm text-neutral-500">
                      Generate a mockup to see the result.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>

        </div>

      </div>
    </main>
  )
}
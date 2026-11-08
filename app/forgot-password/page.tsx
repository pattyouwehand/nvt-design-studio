'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`
      })

      if (error) {
        setError(error.message)
        return
      }

      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f2ec] px-6 py-12">
      <div className="w-full max-w-md">
        <header className="mb-10 text-center">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.3em] text-[#77716a]">
            NVT Company
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-[#171717]">
            Design Studio
          </h1>

          <p className="mt-3 text-sm text-[#77716a]">
            Your creative workspace.
          </p>
        </header>

        <div className="rounded-2xl border border-[#e7e3dc] bg-white p-8 md:p-10">
          {sent ? (
            <div>
              <h2 className="text-2xl font-bold text-[#171717]">
                Check your inbox
              </h2>

              <p className="mt-4 text-sm leading-6 text-[#77716a]">
                If an account exists for this email address,
                you&apos;ll receive a password reset link shortly.
              </p>

              <Link
                href="/login"
                className="mt-6 inline-block text-sm font-medium text-[#171717] underline underline-offset-4"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-[#171717]">
                  Reset your password
                </h2>

                <p className="mt-2 text-sm leading-6 text-[#77716a]">
                  Enter your email address and we&apos;ll send you
                  a link to set a new password.
                </p>
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-[#171717]"
                >
                  Email address
                </label>

                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-[#d9d9d9] bg-white px-4 py-3 text-[#171717] outline-none transition focus:border-[#171717] focus:ring-1 focus:ring-[#171717]"
                />
              </div>

              {error && (
                <p role="alert" className="text-sm text-red-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-[#171717] px-4 py-3 font-semibold text-white transition hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send reset link'}
              </button>

              <div className="text-center">
                <Link
                  href="/login"
                  className="text-sm font-medium text-[#555] underline-offset-4 hover:underline"
                >
                  Back to sign in
                </Link>
              </div>
            </form>
          )}
        </div>

        <p className="mt-8 text-center text-xs text-[#77716a]">
          Private workspace · NVT Company
        </p>
      </div>
    </main>
  )
}
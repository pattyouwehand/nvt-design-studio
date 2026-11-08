'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    async function checkSession() {
      const { data, error } = await supabase.auth.getUser()
      setReady(!error && !!data.user)
    }

    checkSession()

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
          checkSession()
        }
      }
    )

    return () => listener.subscription.unsubscribe()
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 8) {
      setError('Password must contain at least 8 characters.')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        setError(error.message)
        return
      }

      setSuccess(true)
      await supabase.auth.signOut()
      router.refresh()
    } catch {
      setError('Unable to update your password. Please try again.')
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
          {success ? (
            <>
              <h2 className="text-2xl font-bold text-[#171717]">
                Password updated!
              </h2>
              <p className="mt-3 text-sm text-[#77716a]">
                Your password has been saved. You can now sign in.
              </p>
              <Link
                href="/login"
                className="mt-6 block rounded-lg bg-[#171717] px-4 py-3 text-center font-semibold text-white hover:bg-[#333]"
              >
                Go to sign in
              </Link>
            </>
          ) : !ready ? (
            <>
              <h2 className="text-2xl font-bold text-[#171717]">
                Set new password
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#77716a]">
                Checking your reset link. If this page does not unlock,
                request a new password reset email.
              </p>
              <Link
                href="/forgot-password"
                className="mt-5 inline-block text-sm underline"
              >
                Request a new link
              </Link>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-[#171717]">
                  Set new password
                </h2>
                <p className="mt-2 text-sm text-[#77716a]">
                  Choose a secure password for your Studio account.
                </p>
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium">
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-lg border border-[#d9d9d9] px-4 py-3 outline-none focus:border-[#171717]"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium">
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-lg border border-[#d9d9d9] px-4 py-3 outline-none focus:border-[#171717]"
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
                className="w-full rounded-lg bg-[#171717] px-4 py-3 font-semibold text-white hover:bg-[#333] disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
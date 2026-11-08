'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        return
      }

      router.replace('/')
      router.refresh()
    } catch {
      setError('Unable to sign in. Please try again.')
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

        <form
          onSubmit={handleLogin}
          className="space-y-6 rounded-2xl border border-[#e7e3dc] bg-white p-8 md:p-10"
        >
          <div>
            <h2 className="text-2xl font-bold text-[#171717]">
              Welcome back
            </h2>

            <p className="mt-2 text-sm text-[#77716a]">
              Sign in to continue creating.
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

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-[#171717]"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              className="w-full rounded-lg border border-[#d9d9d9] bg-white px-4 py-3 text-[#171717] outline-none transition focus:border-[#171717] focus:ring-1 focus:ring-[#171717]"
            />
          </div>

          <div className="text-right">
            <a
              href="/forgot-password"
              className="text-sm font-medium text-[#555] underline-offset-4 hover:underline"
            >
              Forgot password?
            </a>
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
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-[#77716a]">
          Private workspace · NVT Company
        </p>
      </div>
    </main>
  )
}
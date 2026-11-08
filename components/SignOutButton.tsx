'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut } from 'lucide-react'

export default function SignOutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSignOut() {
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Sign out failed:', error)
      setLoading(false)
      return
    }

    router.replace('/login')
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-50"
    >
      <LogOut size={16} />
      {loading ? 'Signing out...' : 'Sign out'}
    </button>
  )
}
import 'server-only'
import { createClient } from '@/lib/supabase/server'

export async function getStudioUser() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user?.email) {
    return null
  }

  const allowedEmails = (process.env.STUDIO_ALLOWED_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)

  if (!allowedEmails.includes(user.email.toLowerCase())) {
    return null
  }

  return user
}
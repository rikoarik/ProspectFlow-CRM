import 'server-only'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { isAuthConfigured } from '@/lib/env'

export interface AuthSession {
  userId: string
  email: string
  profile: {
    id: string
    full_name: string
    email: string
    role: 'Admin' | 'Sales'
    avatar_url: string | null
  } | null
}

export async function getSession(): Promise<AuthSession | null> {
  if (!isAuthConfigured()) return null
  const supabase = getSupabaseServerClient()
  if (!supabase) return null

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, avatar_url')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  return {
    userId: user.id,
    email: user.email ?? '',
    profile: profile ?? null,
  }
}

export async function requireSession(): Promise<AuthSession> {
  const session = await getSession()
  if (!session) {
    throw new Error('UNAUTHORIZED')
  }
  return session
}
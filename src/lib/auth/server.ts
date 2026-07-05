import 'server-only'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { isAuthConfigured } from '@/lib/env'

export interface CrmProfile {
  id: string
  full_name: string
  email: string
  role: 'Admin' | 'Sales'
  avatar_url: string | null
}

export interface AuthSession {
  userId: string
  email: string
  profile: CrmProfile
}

export async function getProfileByAuthUserId(userId: string): Promise<CrmProfile | null> {
  const supabase = getSupabaseServerClient()
  if (!supabase) return null

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, avatar_url')
    .eq('auth_user_id', userId)
    .maybeSingle()

  if (error) {
    throw new Error(`Load CRM profile failed: ${error.message}`)
  }

  return (profile as CrmProfile | null) ?? null
}

export async function getSession(): Promise<AuthSession | null> {
  if (!isAuthConfigured()) return null
  const supabase = getSupabaseServerClient()
  if (!supabase) return null

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const profile = await getProfileByAuthUserId(user.id)
  if (!profile) return null

  return {
    userId: user.id,
    email: user.email ?? '',
    profile,
  }
}

export async function requireSession(): Promise<AuthSession> {
  const session = await getSession()
  if (!session) {
    throw new Error('UNAUTHORIZED')
  }
  return session
}

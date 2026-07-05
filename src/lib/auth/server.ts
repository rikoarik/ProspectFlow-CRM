import 'server-only'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { isAuthConfigured } from '@/lib/env'

export interface CrmProfile {
  id: string
  full_name: string
  email: string
  username?: string | null
  role: 'Admin' | 'Sales'
  avatar_url: string | null
}

export interface AuthSession {
  userId: string
  email: string
  profile: CrmProfile
}

export interface UsernameLookup {
  profileId: string
  email: string
  full_name: string
  role: 'Admin' | 'Sales'
  avatar_url: string | null
}

/**
 * Resolve a username (as typed in the login form) to the linked profile's
 * email. Email is sensitive and the anon key client can't read profiles
 * pre-login (RLS), so this uses the service-role admin client.
 *
 * Stored usernames are lowercased; login compares via `ilike` so users
 * can type mixed case.
 */
export async function findProfileByUsername(
  username: string,
): Promise<UsernameLookup | null> {
  const admin = getSupabaseAdminClient()
  if (!admin) return null
  const normalized = username.trim().toLowerCase()
  if (!normalized) return null

  const { data, error } = await admin
    .from('profiles')
    .select('id, email, full_name, role, avatar_url')
    .ilike('username', normalized)
    .maybeSingle()

  if (error) {
    throw new Error(`Lookup by username failed: ${error.message}`)
  }
  if (!data) return null

  return {
    profileId: (data as { id: string }).id,
    email: (data as { email: string }).email,
    full_name: (data as { full_name: string }).full_name,
    role: (data as { role: 'Admin' | 'Sales' }).role,
    avatar_url: (data as { avatar_url: string | null }).avatar_url,
  }
}

/**
 * Look up the CRM profile linked to a Supabase Auth user.
 *
 * In the normal case we match on `profiles.auth_user_id`. But auth users
 * created via the Supabase dashboard AFTER the auth-rls migration ran
 * never get backfilled — so we self-heal by matching on email and
 * persisting the link. The caller can pass the user's email directly
 * (login route already has it) to avoid an extra auth lookup.
 *
 * We deliberately use the service-role admin client for the self-healing
 * branch: (a) RLS on the anon-key client forbids writing `auth_user_id`,
 * (b) immediately after `signInWithPassword` the SSR client's cookie
 * isn't readable in the same request, so `auth.getUser()` returns null.
 */
export async function getProfileByAuthUserId(
  userId: string,
  fallbackEmail?: string,
): Promise<CrmProfile | null> {
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

  if (profile) return profile as CrmProfile

  const admin = getSupabaseAdminClient()
  if (!admin) return null

  let email = fallbackEmail?.trim().toLowerCase()
  if (!email) {
    const { data: userRow, error: userErr } = await admin.auth.admin.getUserById(userId)
    if (userErr || !userRow?.user?.email) return null
    email = userRow.user.email.trim().toLowerCase()
  }
  if (!email) return null

  const { data: byEmail, error: linkError } = await admin
    .from('profiles')
    .select('id, full_name, email, role, avatar_url')
    .ilike('email', email)
    .maybeSingle()

  if (linkError) {
    throw new Error(`Load CRM profile by email failed: ${linkError.message}`)
  }
  if (!byEmail) return null

  const profileId = (byEmail as { id: string }).id
  const { data: updated, error: updateError } = await admin
    .from('profiles')
    .update({ auth_user_id: userId })
    .eq('id', profileId)
    .select('id, full_name, email, role, avatar_url')
    .maybeSingle()

  if (updateError) {
    // Link write failed; still return matched profile so this login succeeds.
    return byEmail as CrmProfile
  }
  return (updated as CrmProfile | null) ?? (byEmail as CrmProfile)
}

export async function getSession(): Promise<AuthSession | null> {
  if (!isAuthConfigured()) return null
  const supabase = getSupabaseServerClient()
  if (!supabase) return null

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const profile = await getProfileByAuthUserId(user.id, user.email)
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

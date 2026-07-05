import 'server-only'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
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
    .is('auth_user_id', null)
    .maybeSingle()

  if (linkError) {
    throw new Error(`Load CRM profile by email failed: ${linkError.message}`)
  }
  if (!byEmail) return null

  const { data: updated, error: updateError } = await admin
    .from('profiles')
    .update({ auth_user_id: userId })
    .eq('id', (byEmail as { id: string }).id)
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

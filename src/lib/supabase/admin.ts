import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { supabaseServiceRoleKey, supabaseUrl } from '@/lib/env'

export function getSupabaseAdminClient(): SupabaseClient | null {
  const url = supabaseUrl()
  const serviceRole = supabaseServiceRoleKey()
  if (!url || !serviceRole) return null
  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
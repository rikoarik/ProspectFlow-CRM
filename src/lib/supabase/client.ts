import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return { url, anon }
}

let cachedClient: SupabaseClient | null = null

export function getSupabaseBrowserClient(): SupabaseClient | null {
  const { url, anon } = getSupabaseEnv()
  if (!url || !anon) return null
  if (cachedClient) return cachedClient
  cachedClient = createClient(url, anon)
  return cachedClient
}
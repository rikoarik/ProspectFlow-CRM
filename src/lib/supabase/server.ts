import 'server-only'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabaseAnonKey, supabaseUrl } from '@/lib/env'

export function getSupabaseServerClient(): SupabaseClient | null {
  const url = supabaseUrl()
  const anon = supabaseAnonKey()
  if (!url || !anon) return null
  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookies().getAll()
      },
      setAll(items: { name: string; value: string; options: CookieOptions }[]) {
        try {
          items.forEach(({ name, value, options }) => {
            cookies().set(name, value, options)
          })
        } catch {
          // Called from a Server Component context where cookies are read-only.
          // Middleware handles refresh on subsequent requests.
        }
      },
    },
  })
}
import 'server-only'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAnonKey, supabaseUrl } from '@/lib/env'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const url = supabaseUrl()
  const anon = supabaseAnonKey()
  if (!url || !anon) {
    return response
  }

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(items: { name: string; value: string; options: CookieOptions }[]) {
        items.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        items.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  // Refreshes the session token if it's near expiry.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname + request.nextUrl.search)
    return NextResponse.redirect(redirectUrl)
  }

  return response
}
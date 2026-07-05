import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { findProfileByUsername, getProfileByAuthUserId } from '@/lib/auth/server'
import { isAuthConfigured } from '@/lib/env'

export const runtime = 'nodejs'

interface LoginBody {
  username?: string
  password?: string
}

export async function POST(request: NextRequest) {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { error: 'Auth belum dikonfigurasi. Isi NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, dan SUPABASE_SERVICE_ROLE_KEY di .env.local.' },
      { status: 503 },
    )
  }

  const body = (await request.json().catch(() => ({}))) as LoginBody
  const username = (body.username ?? '').trim()
  const password = body.password ?? ''

  if (!username || !password) {
    return NextResponse.json(
      { error: 'Username dan password wajib diisi.' },
      { status: 400 },
    )
  }

  const supabase = getSupabaseServerClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase client tidak tersedia.' }, { status: 500 })
  }

  const lookup = await findProfileByUsername(username)
  if (!lookup) {
    return NextResponse.json({ error: 'Username tidak ditemukan.' }, { status: 401 })
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: lookup.email,
    password,
  })
  if (error || !data.user) {
    return NextResponse.json({ error: 'Password salah.' }, { status: 401 })
  }

  const profile = await getProfileByAuthUserId(data.user.id, data.user.email)
  if (!profile) {
    await supabase.auth.signOut()
    return NextResponse.json(
      { error: 'Tidak dapat menemukan profil CRM yang terhubung ke akun ini.' },
      { status: 403 },
    )
  }

  return NextResponse.json({
    user: { id: data.user.id, email: data.user.email },
    profile,
  })
}

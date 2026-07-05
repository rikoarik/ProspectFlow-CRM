import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getProfileByAuthUserId } from '@/lib/auth/server'
import { isAuthConfigured } from '@/lib/env'

export const runtime = 'nodejs'

interface LoginBody {
  email?: string
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
  const email = (body.email ?? '').trim().toLowerCase()
  const password = body.password ?? ''

  if (!email || !password) {
    return NextResponse.json({ error: 'Email dan password wajib diisi.' }, { status: 400 })
  }

  const supabase = getSupabaseServerClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase client tidak tersedia.' }, { status: 500 })
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message ?? 'Login gagal. Cek email/password.' },
      { status: 401 },
    )
  }

  const profile = await getProfileByAuthUserId(data.user.id)
  if (!profile) {
    await supabase.auth.signOut()
    return NextResponse.json(
      { error: 'Akun berhasil login, tetapi belum terhubung ke profil CRM.' },
      { status: 403 },
    )
  }

  return NextResponse.json({
    user: { id: data.user.id, email: data.user.email },
    profile,
  })
}
import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { isAuthConfigured } from '@/lib/env'

export const runtime = 'nodejs'

export async function POST() {
  if (!isAuthConfigured()) {
    return NextResponse.json({ ok: true })
  }
  const supabase = getSupabaseServerClient()
  if (supabase) {
    await supabase.auth.signOut()
  }
  return NextResponse.json({ ok: true })
}
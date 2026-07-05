import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/auth/login-form'
import { Brand } from '@/components/brand'
import { getSession } from '@/lib/auth/server'
import { isAuthConfigured } from '@/lib/env'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { redirect?: string }
}) {
  if (isAuthConfigured()) {
    const session = await getSession()
    if (session) {
      redirect(searchParams.redirect ?? '/')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_60%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.18),transparent_55%)]" />
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <Brand variant="light" className="mb-8" />
        <div className="rounded-2xl border border-white/10 bg-white/95 p-8 shadow-2xl backdrop-blur">
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Sign in</h1>
          <p className="mt-1 text-sm text-slate-500">
            Masuk pakai akun Supabase yang sudah dibuat admin untuk kamu.
          </p>
          <LoginForm redirect={searchParams.redirect ?? '/'} />
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">
          Belum punya akun? Hubungi admin tim sales kamu.
        </p>
      </div>
    </div>
  )
}

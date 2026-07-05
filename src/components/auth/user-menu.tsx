'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiRequest } from '@/lib/api'

interface UserMenuProps {
  name: string
  email: string
  role: 'Admin' | 'Sales'
}

export function UserMenu({ name, email, role }: UserMenuProps) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)

  async function onSignOut() {
    setPending(true)
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' })
      router.replace('/login')
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  const initials = name
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('') || email.slice(0, 2).toUpperCase()

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white">
        {initials}
      </div>
      <div className="hidden flex-col text-left sm:flex">
        <div className="text-sm font-semibold text-slate-950">{name}</div>
        <div className="text-xs text-slate-500">
          {role} · {email}
        </div>
      </div>
      <Button variant="ghost" size="icon" onClick={onSignOut} disabled={pending} aria-label="Sign out">
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  )
}
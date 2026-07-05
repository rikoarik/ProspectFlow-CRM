'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { PipelineView } from '@/lib/types'

const ITEMS: { id: PipelineView; label: string }[] = [
  { id: 'semua', label: 'Semua' },
  { id: 'aktif', label: 'Aktif' },
  { id: 'followup', label: 'Follow up' },
  { id: 'arsip', label: 'Arsip' },
]

export function PipelineViewTabs({ current }: { current: PipelineView }) {
  const pathname = usePathname()
  const params = useSearchParams()
  const baseParams = new URLSearchParams(params?.toString() ?? '')

  return (
    <div className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
      {ITEMS.map((item) => {
        const next = new URLSearchParams(baseParams)
        if (item.id === 'semua') next.delete('view')
        else next.set('view', item.id)
        const qs = next.toString()
        const href = qs ? `${pathname}?${qs}` : pathname
        const active = item.id === current

        return (
          <Link
            key={item.id}
            href={href}
            replace
            scroll={false}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              active
                ? 'bg-slate-950 text-white shadow'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </div>
  )
}

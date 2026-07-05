'use client'

import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import type { Priority } from '@/lib/types'

export function PipelineFilters({
  query,
  priority,
  total,
  shown,
  onQueryChange,
  onPriorityChange,
}: {
  query: string
  priority: 'all' | Priority
  total: number
  shown: number
  onQueryChange: (query: string) => void
  onPriorityChange: (priority: 'all' | Priority) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="relative min-w-[220px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Cari company atau city..."
          className="pl-9"
          aria-label="Cari prospek"
        />
      </div>
      <div className="w-44">
        <Select
          value={priority}
          onChange={(e) => onPriorityChange(e.target.value as 'all' | Priority)}
          aria-label="Filter priority"
        >
          <option value="all">Semua priority</option>
          <option value="A">Priority A</option>
          <option value="B">Priority B</option>
          <option value="C">Priority C</option>
        </Select>
      </div>
      <div className="ml-auto text-sm text-slate-500">
        Menampilkan {shown} / {total}
      </div>
    </div>
  )
}

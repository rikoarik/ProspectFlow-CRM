'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Inbox, MapPin } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { PriorityBadge } from '@/components/status-badge'
import { useToast } from '@/components/ui/toast'
import { apiRequest } from '@/lib/api'
import {
  filterStatusesByView,
  PIPELINE_STATUSES,
  type PipelineView,
  type Priority,
  type Prospect,
  type ProspectStatus,
  type Sales,
} from '@/lib/types'
import { formatDate } from '@/lib/utils'

export function KanbanBoard({
  initialProspects,
  sales,
  view = 'semua',
  query = '',
  priority = 'all',
}: {
  initialProspects: Prospect[]
  sales: Sales[]
  view?: PipelineView
  query?: string
  priority?: 'all' | Priority
}) {
  const [prospects, setProspects] = React.useState(initialProspects)
  const [dragging, setDragging] = React.useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  React.useEffect(() => {
    setProspects(initialProspects)
  }, [initialProspects])

  const salesName = React.useMemo(() => new Map(sales.map((s) => [s.id, s.full_name])), [sales])
  const visibleStatuses = React.useMemo(
    () => filterStatusesByView(PIPELINE_STATUSES, view),
    [view],
  )

  const sourceItems = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return prospects.filter((prospect) => {
      if (!visibleStatuses.includes(prospect.status)) return false
      if (priority !== 'all' && prospect.priority !== priority) return false
      if (!normalizedQuery) return true
      return (
        prospect.company_name.toLowerCase().includes(normalizedQuery) ||
        prospect.city.toLowerCase().includes(normalizedQuery)
      )
    })
  }, [prospects, visibleStatuses, query, priority])

  async function move(id: string, status: ProspectStatus) {
    const prospect = prospects.find((p) => p.id === id)
    if (!prospect || prospect.status === status) return
    const previous = prospects
    setProspects((items) => items.map((p) => (p.id === id ? { ...p, status } : p)))
    try {
      await apiRequest<{ prospect: Prospect }>('/api/prospects/status', {
        method: 'POST',
        body: JSON.stringify({ id, status }),
      })
      router.refresh()
      toast({
        title: 'Pipeline updated',
        description: `${prospect.company_name} dipindah ke ${status}.`,
        variant: 'success',
      })
    } catch (error) {
      setProspects(previous)
      toast({
        title: 'Gagal memindahkan card',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'error',
      })
    }
  }

  return (
    <div className="overflow-x-auto pb-4 scrollbar-thin">
      <div
        className="grid min-w-[1680px] gap-4"
        style={{ gridTemplateColumns: `repeat(${visibleStatuses.length}, minmax(220px, 1fr))` }}
      >
        {visibleStatuses.map((status) => {
          const items = sourceItems.filter((p) => p.status === status)
          return (
            <section
              key={status}
              onDragOver={(e) => {
                e.preventDefault()
                e.currentTarget.dataset.hover = 'true'
              }}
              onDragLeave={(e) => {
                e.currentTarget.dataset.hover = 'false'
              }}
              onDrop={(e) => {
                e.preventDefault()
                e.currentTarget.dataset.hover = 'false'
                const id = e.dataTransfer.getData('text/plain') || dragging
                if (id) move(id, status)
                setDragging(null)
              }}
              className="rounded-2xl border border-slate-200 bg-white/80 p-3 transition-colors data-[hover=true]:bg-emerald-50 data-[hover=true]:ring-2 data-[hover=true]:ring-emerald-300"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                    {status}
                  </h2>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {items.length}
                </span>
              </div>
              <div className="space-y-3">
                {items.map((p) => (
                  <Card
                    key={p.id}
                    draggable
                    data-dragging={dragging === p.id ? 'true' : 'false'}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', p.id)
                      setDragging(p.id)
                    }}
                    onDragEnd={() => setDragging(null)}
                    className="cursor-grab bg-gradient-to-b from-white to-slate-50/40 p-3.5 transition-all hover:border-emerald-200 hover:shadow-md active:scale-[0.99] active:cursor-grabbing data-[dragging=true]:ring-2 data-[dragging=true]:ring-emerald-200"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/prospects/${p.id}`}
                        className="font-semibold text-slate-950 hover:text-emerald-600"
                      >
                        {p.company_name}
                      </Link>
                      <MapPin className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-400" />
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{p.city || 'No city'}</div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <PriorityBadge priority={p.priority} />
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                        {salesName.get(p.assigned_to ?? '')?.split(' ')[0] ?? 'Unassigned'}
                      </span>
                    </div>
                    {p.next_follow_up_at ? (
                      <div className="mt-3 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-700">
                        Follow up {formatDate(p.next_follow_up_at)}
                      </div>
                    ) : null}
                  </Card>
                ))}
                {!items.length ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                    <Inbox className="mx-auto mb-2 h-5 w-5 text-slate-300" />
                    Belum ada prospek
                  </div>
                ) : null}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

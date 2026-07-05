'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MapPin } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { PriorityBadge } from '@/components/status-badge'
import { useToast } from '@/components/ui/toast'
import { apiRequest } from '@/lib/api'
import { PIPELINE_STATUSES, type Prospect, type ProspectStatus, type Sales } from '@/lib/types'
import { formatDate } from '@/lib/utils'

export function KanbanBoard({ initialProspects, sales }: { initialProspects: Prospect[]; sales: Sales[] }) {
  const [prospects, setProspects] = React.useState(initialProspects)
  const [dragging, setDragging] = React.useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()
  const salesName = React.useMemo(() => new Map(sales.map((s) => [s.id, s.full_name])), [sales])

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
      toast({ title: 'Pipeline updated', description: `${prospect.company_name} dipindah ke ${status}.`, variant: 'success' })
    } catch (error) {
      setProspects(previous)
      toast({ title: 'Gagal memindahkan card', description: error instanceof Error ? error.message : 'Unknown error', variant: 'error' })
    }
  }

  return (
    <div className="overflow-x-auto pb-4 scrollbar-thin">
      <div className="grid min-w-[1680px] grid-cols-12 gap-4">
        {PIPELINE_STATUSES.map((status) => {
          const items = prospects.filter((p) => p.status === status)
          return (
            <section
              key={status}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const id = e.dataTransfer.getData('text/plain') || dragging
                if (id) move(id, status)
                setDragging(null)
              }}
              className="rounded-2xl border border-slate-200 bg-white/70 p-3"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-950">{status}</h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{items.length}</span>
              </div>
              <div className="space-y-3">
                {items.map((p) => (
                  <Card
                    key={p.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', p.id)
                      setDragging(p.id)
                    }}
                    onDragEnd={() => setDragging(null)}
                    className="cursor-grab p-3 active:cursor-grabbing"
                  >
                    <Link href={`/prospects/${p.id}`} className="font-semibold text-slate-950 hover:text-emerald-600">
                      {p.company_name}
                    </Link>
                    <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="h-3 w-3" /> {p.city || 'No city'}
                    </div>
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
                    Drop card here
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
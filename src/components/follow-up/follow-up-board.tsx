'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Clock3, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { apiRequest } from '@/lib/api'
import type { FollowUp, Prospect, Sales } from '@/lib/types'
import { followUpBuckets, prospectByIdMap, salesByIdMap } from '@/lib/data/analytics'
import { formatDateTime } from '@/lib/utils'

export function FollowUpBoard({ initialFollowUps, prospects, sales }: { initialFollowUps: FollowUp[]; prospects: Prospect[]; sales: Sales[] }) {
  const [followUps, setFollowUps] = React.useState(initialFollowUps)
  const [notes, setNotes] = React.useState<Record<string, string>>({})
  const [reschedule, setReschedule] = React.useState<Record<string, string>>({})
  const { toast } = useToast()
  const router = useRouter()
  const prospectMap = React.useMemo(() => prospectByIdMap(prospects), [prospects])
  const salesMap = React.useMemo(() => salesByIdMap(sales), [sales])
  const buckets = followUpBuckets(followUps)

  async function done(id: string) {
    const note = notes[id] ?? ''
    try {
      await apiRequest<{ followUp: FollowUp }>('/api/follow-ups', {
        method: 'PATCH',
        body: JSON.stringify({ id, action: 'complete', notes: note }),
      })
      setFollowUps((items) => items.map((f) => (f.id === id ? { ...f, status: 'Done', notes: note } : f)))
      router.refresh()
      toast({ title: 'Follow up completed', variant: 'success' })
    } catch (error) {
      toast({ title: 'Gagal complete follow up', description: error instanceof Error ? error.message : 'Unknown error', variant: 'error' })
    }
  }

  async function rescheduleItem(id: string) {
    const value = reschedule[id]
    if (!value) return toast({ title: 'Pilih jadwal baru', variant: 'error' })
    const nextDate = new Date(value).toISOString()
    try {
      await apiRequest<{ followUp: FollowUp }>('/api/follow-ups', {
        method: 'PATCH',
        body: JSON.stringify({ id, action: 'reschedule', follow_up_date: nextDate }),
      })
      setFollowUps((items) => items.map((f) => (f.id === id ? { ...f, status: 'Rescheduled', follow_up_date: nextDate } : f)))
      router.refresh()
      toast({ title: 'Follow up rescheduled', variant: 'success' })
    } catch (error) {
      toast({ title: 'Gagal reschedule follow up', description: error instanceof Error ? error.message : 'Unknown error', variant: 'error' })
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-4">
      <Column title="Terlambat" icon={<Clock3 className="h-4 w-4 text-rose-600" />} items={buckets.overdue} empty="Tidak ada follow up terlambat" />
      <Column title="Hari ini" icon={<Clock3 className="h-4 w-4 text-amber-600" />} items={buckets.today} empty="Tidak ada follow up hari ini" />
      <Column title="Minggu ini" icon={<Clock3 className="h-4 w-4 text-emerald-600" />} items={buckets.week} empty="Tidak ada follow up minggu ini" />
      <Column title="Selesai" icon={<CheckCircle2 className="h-4 w-4 text-slate-500" />} items={buckets.done} empty="Belum ada follow up selesai" />
      <div className="xl:col-span-4">
        <Card>
          <CardHeader><CardTitle>Calendar view sederhana</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {followUps.slice(0, 16).map((f) => renderItem(f, true))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  function Column({ title, icon, items, empty }: { title: string; icon: React.ReactNode; items: FollowUp[]; empty: string }) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2">{icon}{title} <span className="text-sm text-slate-400">{items.length}</span></CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {items.length ? items.map((f) => renderItem(f, false)) : <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">{empty}</div>}
        </CardContent>
      </Card>
    )
  }

  function renderItem(f: FollowUp, compact: boolean) {
    const p = prospectMap.get(f.prospect_id)
    const s = salesMap.get(f.sales_id ?? '')
    return (
      <div key={f.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-slate-950">
          {p ? <Link href={`/prospects/${p.id}`} className="hover:text-emerald-600">{p.company_name}</Link> : 'Unknown prospect'}
        </div>
        <div className="mt-1 text-xs text-slate-500">{formatDateTime(f.follow_up_date)} · {s?.full_name ?? 'Unassigned'}</div>
        <div className="mt-2 text-sm text-slate-600">{f.reason}</div>
        {!compact ? (
          <div className="mt-3 space-y-2">
            <Textarea aria-label="Follow up note" placeholder="Follow up note" value={notes[f.id] ?? ''} onChange={(e) => setNotes((n) => ({ ...n, [f.id]: e.target.value }))} />
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <Input aria-label="Jadwal baru follow up" type="datetime-local" value={reschedule[f.id] ?? ''} onChange={(e) => setReschedule((r) => ({ ...r, [f.id]: e.target.value }))} />
              <Button variant="outline" size="sm" onClick={() => rescheduleItem(f.id)}><RotateCw className="h-3.5 w-3.5" /> Reschedule</Button>
            </div>
            {f.status !== 'Done' ? <Button variant="accent" size="sm" onClick={() => done(f.id)}><CheckCircle2 className="h-3.5 w-3.5" /> Complete</Button> : null}
          </div>
        ) : null}
      </div>
    )
  }
}
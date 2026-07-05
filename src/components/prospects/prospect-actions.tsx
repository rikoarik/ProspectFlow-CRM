'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Clock, Handshake, MessageCircle, Send, ThumbsDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { apiRequest } from '@/lib/api'
import type { Communication, FollowUp, Prospect, ProspectStatus, Sales } from '@/lib/types'

const quickActions: { label: string; status: ProspectStatus; icon: any; summary: string }[] = [
  { label: 'Mark as Contacted', status: 'Contacted', icon: Send, summary: 'Prospek sudah dikontak.' },
  { label: 'Add Reply', status: 'Replied', icon: MessageCircle, summary: 'Prospek membalas pesan.' },
  { label: 'Mark Interested', status: 'Interested', icon: CheckCircle2, summary: 'Prospek menunjukkan minat.' },
  { label: 'Mark Deal', status: 'Deal', icon: Handshake, summary: 'Prospek menjadi deal.' },
  { label: 'Mark Rejected', status: 'Rejected', icon: ThumbsDown, summary: 'Prospek tidak tertarik.' },
]

export function ProspectActions({ prospect, sales }: { prospect: Prospect; sales: Sales | null }) {
  const [status, setStatus] = React.useState<ProspectStatus>(prospect.status)
  const [summary, setSummary] = React.useState('')
  const [followDate, setFollowDate] = React.useState('')
  const [followReason, setFollowReason] = React.useState('Follow up setelah outreach')
  const [loading, setLoading] = React.useState(false)
  const { toast } = useToast()
  const router = useRouter()

  async function updateStatus(next: ProspectStatus, messageSummary: string) {
    setLoading(true)
    try {
      await apiRequest<{ prospect: Prospect }>('/api/prospects/status', {
        method: 'POST',
        body: JSON.stringify({ id: prospect.id, status: next }),
      })
      await apiRequest<{ communication: Communication }>('/api/communications', {
        method: 'POST',
        body: JSON.stringify({
          prospect_id: prospect.id,
          sales_id: sales?.id ?? prospect.assigned_to,
          channel: prospect.first_channel || 'WhatsApp',
          direction: next === 'Replied' ? 'Inbound' : 'Outbound',
          message_summary: summary || messageSummary,
          response_summary: next === 'Replied' ? summary || 'Prospek membalas pesan.' : '',
          status_after: next,
        }),
      })
      setStatus(next)
      setSummary('')
      router.refresh()
      toast({ title: 'Status diperbarui', description: `${prospect.company_name} → ${next}`, variant: 'success' })
    } catch (error) {
      toast({ title: 'Gagal memperbarui status', description: error instanceof Error ? error.message : 'Unknown error', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function addFollowUp() {
    if (!followDate) return toast({ title: 'Tanggal wajib diisi', description: 'Pilih tanggal follow up.', variant: 'error' })
    setLoading(true)
    try {
      await apiRequest<{ followUp: FollowUp }>('/api/follow-ups', {
        method: 'POST',
        body: JSON.stringify({
          prospect_id: prospect.id,
          sales_id: sales?.id ?? prospect.assigned_to,
          follow_up_date: new Date(followDate).toISOString(),
          reason: followReason,
          status: 'Pending',
          notes: '',
        }),
      })
      setStatus('Need Follow Up')
      router.refresh()
      toast({ title: 'Follow up dijadwalkan', description: followReason, variant: 'success' })
    } catch (error) {
      toast({ title: 'Gagal schedule follow up', description: error instanceof Error ? error.message : 'Unknown error', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {quickActions.map((action) => {
          const Icon = action.icon
          return (
            <Button key={action.label} variant="outline" size="sm" disabled={loading} onClick={() => updateStatus(action.status, action.summary)}>
              <Icon className="h-3.5 w-3.5" /> {action.label}
            </Button>
          )
        })}
      </div>
      <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
        <Textarea aria-label="Catatan chat" placeholder="Catatan chat / ringkasan respon..." value={summary} onChange={(e) => setSummary(e.target.value)} />
        <div className="space-y-2">
          <Select aria-label="Update status" value={status} onChange={(e) => setStatus(e.target.value as ProspectStatus)}>
            {['New','Need Review','Ready to Contact','Contacted','Replied','Interested','Need Follow Up','Proposal Sent','Deal','Rejected','No Response','Archived'].map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Button className="w-full" variant="accent" disabled={loading} onClick={() => updateStatus(status, summary || 'Status diperbarui manual.')}>Update status</Button>
        </div>
      </div>
      <div className="rounded-xl bg-slate-50 p-3">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-950"><Clock className="h-4 w-4" /> Schedule Follow Up</div>
        <div className="grid gap-2 md:grid-cols-[190px_1fr_auto]">
          <Input aria-label="Tanggal follow up" type="datetime-local" value={followDate} onChange={(e) => setFollowDate(e.target.value)} />
          <Input aria-label="Alasan follow up" value={followReason} onChange={(e) => setFollowReason(e.target.value)} placeholder="Reason" />
          <Button disabled={loading} onClick={addFollowUp}>Schedule</Button>
        </div>
      </div>
    </div>
  )
}
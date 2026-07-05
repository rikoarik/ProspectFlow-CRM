import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export function KpiCard({
  title,
  value,
  helper,
  icon: Icon,
  tone = 'emerald',
}: {
  title: string
  value: string | number
  helper?: string
  icon: LucideIcon
  tone?: 'emerald' | 'blue' | 'amber' | 'rose' | 'slate' | 'violet'
}) {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    slate: 'bg-slate-100 text-slate-600',
    violet: 'bg-violet-50 text-violet-600',
  }
  return (
    <Card className="overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500" />
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-slate-500">{title}</div>
            <div className="mt-2 font-[var(--font-space)] text-3xl font-bold tracking-tight text-slate-950">{value}</div>
            {helper ? <div className="mt-1 text-xs text-slate-500">{helper}</div> : null}
          </div>
          <div className={`rounded-2xl p-3 ${tones[tone]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
import { CalendarClock, CheckCircle2, Target, TrendingUp } from 'lucide-react'
import { KpiCard } from '@/components/dashboard/kpi-card'
import type { PipelineMetrics } from '@/lib/data/analytics'

export function PipelineKpiStrip({ metrics }: { metrics: PipelineMetrics }) {
  const totalValueLabel = metrics.totalValue > 0 ? metrics.totalValue.toLocaleString('id-ID') : '—'
  const topStageLabel = metrics.topStage ?? '—'

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard title="Total prospek" value={metrics.total} helper="Semua status gabungan" icon={Target} tone="blue" />
      <KpiCard
        title="Total value"
        value={totalValueLabel}
        helper="Placeholder sampai domain punya nilai deal"
        icon={TrendingUp}
        tone="violet"
      />
      <KpiCard
        title="Stage teratas"
        value={topStageLabel}
        helper="Status dengan prospek terbanyak"
        icon={CheckCircle2}
        tone="emerald"
      />
      <KpiCard
        title="Stale follow up"
        value={metrics.staleCount}
        helper="Lewat tanggal hari ini"
        icon={CalendarClock}
        tone="rose"
      />
    </div>
  )
}

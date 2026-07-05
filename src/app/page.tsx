import Link from 'next/link'
import {
  CalendarClock,
  CheckCircle2,
  MessageCircleReply,
  Target,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { PriorityBar, SalesBar, StatusPie } from '@/components/dashboard/charts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PriorityBadge, StatusBadge } from '@/components/status-badge'
import { getAudits, getFollowUps, getProspects, getSales } from '@/lib/data/queries'
import { dashboardStats, priorityDistribution, prospectsPerSales, statusDistribution } from '@/lib/data/analytics'
import { formatDate } from '@/lib/utils'

export default async function DashboardPage() {
  const [prospects, sales, followUps, audits] = await Promise.all([
    getProspects(),
    getSales(),
    getFollowUps(),
    getAudits(),
  ])
  const stats = dashboardStats(prospects, followUps, audits)
  const highPriority = prospects.filter((p) => p.priority === 'A').slice(0, 6)
  const dueSoon = prospects
    .filter((p) => p.next_follow_up_at)
    .sort((a, b) => new Date(a.next_follow_up_at ?? 0).getTime() - new Date(b.next_follow_up_at ?? 0).getTime())
    .slice(0, 6)

  return (
    <div>
      <PageHeader
        eyebrow="Sales command center"
        title="Kelola prospek dari riset sampai deal"
        description="Dashboard untuk melihat prioritas outreach, follow-up hari ini, audit website, dan performa pipeline sales B2B."
        actions={<Button asChild variant="accent"><Link href="/prospects">Import Prospect CSV</Link></Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Total prospek" value={stats.total} helper="Seeded dari Combined Database" icon={Target} tone="blue" />
        <KpiCard title="Belum dihubungi" value={stats.new} helper="Butuh review dan outreach" icon={Zap} tone="amber" />
        <KpiCard title="Sudah dibalas" value={stats.replied} helper={`${stats.contactedToReplied}% contacted → replied`} icon={MessageCircleReply} tone="violet" />
        <KpiCard title="Deal" value={stats.deal} helper={`${stats.repliedToDeal}% replied → deal`} icon={CheckCircle2} tone="emerald" />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Follow up hari ini" value={stats.followUpToday} helper={`${stats.overdueFollowUps} terlambat`} icon={CalendarClock} tone="rose" />
        <KpiCard title="Priority A" value={stats.highPriority} helper="Prospek nilai tinggi" icon={TrendingUp} tone="rose" />
        <KpiCard title="Audit terkirim" value={stats.auditsSent} helper="Sent / Approved" icon={Users} tone="slate" />
        <KpiCard title="Contacted" value={stats.contacted} helper="Termasuk replied & proposal" icon={MessageCircleReply} tone="blue" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <StatusPie data={statusDistribution(prospects)} />
        <SalesBar data={prospectsPerSales(prospects, sales)} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <PriorityBar data={priorityDistribution(prospects)} />
        <Card>
          <CardHeader>
            <CardTitle>Priority A — outreach queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {highPriority.map((p) => (
              <Link key={p.id} href={`/prospects/${p.id}`} className="flex flex-col gap-2 rounded-xl border border-slate-100 p-3 transition-colors hover:border-emerald-200 hover:bg-emerald-50/40 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-medium text-slate-950">{p.company_name}</div>
                  <div className="text-xs text-slate-500">{p.city} · {p.industry}</div>
                </div>
                <div className="flex items-center gap-2">
                  <PriorityBadge priority={p.priority} />
                  <StatusBadge status={p.status} />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Follow up terdekat</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {dueSoon.map((p) => (
            <div key={p.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-950">{p.company_name}</div>
                  <div className="mt-1 text-xs text-slate-500">{p.city}</div>
                </div>
                <StatusBadge status={p.status} />
              </div>
              <div className="mt-3 text-sm text-slate-600">Next: {formatDate(p.next_follow_up_at)}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
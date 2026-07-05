import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getProspects, getSales } from '@/lib/data/queries'
import { prospectsPerSales } from '@/lib/data/analytics'

export default async function SalesTeamPage() {
  const [sales, prospects] = await Promise.all([getSales(), getProspects()])
  const perf = prospectsPerSales(prospects, sales)
  return (
    <div>
      <PageHeader
        eyebrow="Sales team"
        title="Assignment dan performa sales"
        description="Role Admin bisa melihat semua data. Role Sales diarahkan hanya melihat prospek assigned di Supabase/RLS production."
      />
      <div className="grid gap-4 xl:grid-cols-3">
        {sales.map((s) => {
          const p = perf.find((item) => s.full_name.startsWith(item.name))
          return (
            <Card key={s.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{s.full_name}</CardTitle>
                    <p className="mt-1 text-sm text-slate-500">{s.email}</p>
                  </div>
                  <Badge>{s.role}</Badge>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-3 text-center">
                <Metric label="Prospek" value={p?.total ?? 0} />
                <Metric label="Replied" value={p?.replied ?? 0} />
                <Metric label="Deal" value={p?.deal ?? 0} />
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl bg-slate-50 p-3"><div className="text-xl font-bold text-slate-950">{value}</div><div className="text-xs text-slate-500">{label}</div></div>
}
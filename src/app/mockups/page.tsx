import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge, PriorityBadge } from '@/components/status-badge'
import { MockupThumbnail } from '@/components/mockups/mockup-thumbnail'
import { getAudits, getProspects } from '@/lib/data/queries'

export default async function MockupsPage() {
  const [prospects, audits] = await Promise.all([getProspects(), getAudits()])

  const auditsByProspect = new Map<string, (typeof audits)[number]>()
  for (const audit of audits) {
    if (!auditsByProspect.has(audit.prospect_id)) auditsByProspect.set(audit.prospect_id, audit)
  }

  const rows = prospects.map((prospect) => ({
    prospect,
    audit: auditsByProspect.get(prospect.id) ?? null,
  }))

  const withMockup = rows.filter((r) => Boolean(r.audit?.mockup_url || r.audit?.mockup_html))
  const withoutMockup = rows.filter((r) => !r.audit?.mockup_url && !r.audit?.mockup_html)

  return (
    <div>
      <PageHeader
        eyebrow="AI Mockups"
        title="Generate web mockup per prospek"
        description="OpenAI-compatible endpoint menghasilkan HTML mockup yang disimpan di Supabase Storage + audits.mockup_url. Klik salah satu prospek untuk membuka studio."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Total prospek" value={rows.length} />
        <Stat label="Sudah ada mockup" value={withMockup.length} accent="emerald" />
        <Stat label="Belum ada mockup" value={withoutMockup.length} accent="amber" />
      </div>

      {withMockup.length ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Mockup yang sudah di-generate</CardTitle>
            <CardDescription>Klik kartu untuk membuka studio dan refine copy.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {withMockup.map(({ prospect, audit }) => (
              <Link
                key={prospect.id}
                href={`/mockups/${prospect.id}`}
                className="group flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-emerald-200 hover:bg-emerald-50/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-950">{prospect.company_name}</div>
                    <div className="text-xs text-slate-500">{prospect.industry || '—'} · {prospect.city || '—'}</div>
                  </div>
                  <PriorityBadge priority={prospect.priority} />
                </div>
                <MockupThumbnail
                  html={audit?.mockup_html}
                  url={audit?.mockup_url}
                  fallback={Boolean(audit?.mockup_fallback)}
                  generatedAt={audit?.mockup_generated_at ?? null}
                  className="h-44"
                  label={prospect.company_name}
                />
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <StatusBadge status={prospect.status} />
                  <span className="inline-flex items-center gap-1 text-emerald-700 group-hover:underline">
                    Buka studio <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Prospek yang belum punya mockup</CardTitle>
          <CardDescription>Generate dari sini untuk menambahkan visual ke prospek.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {withoutMockup.slice(0, 24).map(({ prospect }) => (
            <Link
              key={prospect.id}
              href={`/mockups/${prospect.id}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition-colors hover:border-emerald-200 hover:bg-emerald-50/40"
            >
              <div>
                <div className="text-sm font-semibold text-slate-950">{prospect.company_name}</div>
                <div className="text-xs text-slate-500">{prospect.industry || '—'} · {prospect.city || '—'}</div>
              </div>
              <Sparkles className="h-4 w-4 text-emerald-600" />
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: 'emerald' | 'amber' }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div
        className={`mt-1 text-2xl font-bold ${
          accent === 'emerald' ? 'text-emerald-700' : accent === 'amber' ? 'text-amber-700' : 'text-slate-950'
        }`}
      >
        {value}
      </div>
    </div>
  )
}
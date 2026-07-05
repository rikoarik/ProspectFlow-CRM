import Link from 'next/link'
import { FileSearch, Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { MockupThumbnail } from '@/components/mockups/mockup-thumbnail'
import { getAudits, getProspects } from '@/lib/data/queries'
import { prospectByIdMap } from '@/lib/data/analytics'

export default async function AuditPage() {
  const [audits, prospects] = await Promise.all([getAudits(), getProspects()])
  const map = prospectByIdMap(prospects)
  return (
    <div>
      <PageHeader
        eyebrow="Audit management"
        title="Website audit untuk bahan outreach"
        description="Simpan problem, mobile/CTA/performance/trust/copywriting issue, rekomendasi, file audit, dan mockup link."
      />
      {audits.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {audits.map((audit) => {
            const p = map.get(audit.prospect_id)
            return (
              <Card key={audit.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle>{p ? <Link href={`/prospects/${p.id}`} className="hover:text-emerald-600">{p.company_name}</Link> : 'Unknown prospect'}</CardTitle>
                      <p className="mt-1 text-sm text-slate-500">{p?.city} · {p?.industry}</p>
                    </div>
                    <Badge>{audit.audit_status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Problem summary</div>
                    <p className="mt-1 text-sm leading-6 text-slate-700">{audit.problem_summary}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <Issue label="Mobile" active={audit.mobile_issue} />
                    <Issue label="CTA" active={audit.cta_issue} />
                    <Issue label="Performance" active={audit.performance_issue} />
                    <Issue label="Trust" active={audit.trust_issue} />
                    <Issue label="Copywriting" active={audit.copywriting_issue} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Recommendation</div>
                    <p className="mt-1 text-sm leading-6 text-slate-700">{audit.recommendation}</p>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <div className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                        <Sparkles className="h-3 w-3" /> AI Web Mockup
                      </div>
                      <Link href={`/mockups/${p?.id ?? ''}`} className="text-xs font-medium text-emerald-700 hover:underline">
                        Buka studio →
                      </Link>
                    </div>
                    <MockupThumbnail
                      html={audit.mockup_html}
                      url={audit.mockup_url}
                      fallback={Boolean(audit.mockup_fallback)}
                      generatedAt={audit.mockup_generated_at ?? null}
                      label={p?.company_name ?? 'Mockup'}
                    />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <EmptyState icon={FileSearch} title="Belum ada audit" description="Tambahkan audit website dari halaman detail prospek." />
      )}
    </div>
  )
}

function Issue({ label, active }: { label: string; active: boolean }) {
  return <div className={active ? 'rounded-lg bg-rose-50 px-3 py-2 text-rose-700' : 'rounded-lg bg-slate-50 px-3 py-2 text-slate-400'}>{label}</div>
}
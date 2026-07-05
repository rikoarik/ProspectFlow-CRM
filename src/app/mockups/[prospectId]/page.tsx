import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { StatusBadge, PriorityBadge } from '@/components/status-badge'
import { MockupStudio } from '@/components/mockups/mockup-studio'
import { getAuditByProspect, getProspect } from '@/lib/data/queries'

export default async function MockupStudioPage({ params }: { params: { prospectId: string } }) {
  const prospect = await getProspect(params.prospectId)
  if (!prospect) notFound()
  const audit = await getAuditByProspect(prospect.id)

  return (
    <div>
      <PageHeader
        eyebrow="AI Mockup Studio"
        title={prospect.company_name}
        description={`${prospect.industry || 'No industry'} · ${prospect.city || 'No city'} · ${prospect.website_audit_signal || 'No audit signal'}`}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/mockups">
                <ArrowLeft className="h-4 w-4" />
                Kembali
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/prospects/${prospect.id}`}>Lihat prospect detail</Link>
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusBadge status={prospect.status} />
        <PriorityBadge priority={prospect.priority} />
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
          Confidence {prospect.active_confidence}
        </span>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
          Assigned to {prospect.assigned_to ?? 'unassigned'}
        </span>
      </div>

      <MockupStudio
        prospect={prospect}
        initialHtml={audit?.mockup_html ?? ''}
        initialUrl={audit?.mockup_url ?? ''}
        initialFallback={Boolean(audit?.mockup_fallback)}
        initialAuditId={audit?.id ?? null}
      />
    </div>
  )
}
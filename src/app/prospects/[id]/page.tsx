import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExternalLink, Mail, MessageCircle, Phone } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PriorityBadge, StatusBadge } from '@/components/status-badge'
import { ProspectActions } from '@/components/prospects/prospect-actions'
import { ProspectMockupButton } from '@/components/prospects/prospect-mockup-button'
import { MockupThumbnail } from '@/components/mockups/mockup-thumbnail'
import { getAuditByProspect, getCommunications, getFollowUpsByProspect, getProspect, getSalesById } from '@/lib/data/queries'
import { buildWhatsAppUrl, formatDate, formatDateTime, safeUrl } from '@/lib/utils'

export default async function ProspectDetailPage({ params }: { params: { id: string } }) {
  const prospect = await getProspect(params.id)
  if (!prospect) notFound()
  const [sales, communications, followUps, audit] = await Promise.all([
    getSalesById(prospect.assigned_to),
    getCommunications(prospect.id),
    getFollowUpsByProspect(prospect.id),
    getAuditByProspect(prospect.id),
  ])
  const waUrl = prospect.phone ? buildWhatsAppUrl(prospect.phone, `Halo Pak/Bu, saya ingin diskusi singkat terkait website ${prospect.company_name}.`) : ''

  return (
    <div>
      <PageHeader
        eyebrow="Prospect detail"
        title={prospect.company_name}
        description={`${prospect.industry || 'No industry'} · ${prospect.city || 'No city'} · Assigned to ${sales?.full_name ?? 'Unassigned'}`}
        actions={
          <>
            {prospect.website ? <Button asChild variant="outline"><a href={safeUrl(prospect.website)} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /> Buka website</a></Button> : null}
            {waUrl ? <Button asChild variant="accent"><a href={waUrl} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" /> Chat WhatsApp</a></Button> : null}
            {prospect.email ? <Button asChild variant="outline"><a href={`mailto:${prospect.email.split(',')[0]}`}><Mail className="h-4 w-4" /> Kirim email</a></Button> : null}
            <ProspectMockupButton prospect={prospect} audit={audit} />
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <StatusBadge status={prospect.status} />
        <PriorityBadge priority={prospect.priority} />
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">Confidence {prospect.active_confidence}</span>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Company info</CardTitle>
              <CardDescription>Data kontak dan evidence dari hasil riset.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Info label="Industry" value={prospect.industry} />
              <Info label="City / Area" value={prospect.city} />
              <Info label="Website" value={prospect.website} />
              <Info label="Email" value={prospect.email} />
              <Info label="Phone / WhatsApp" value={prospect.phone} icon={<Phone className="h-3.5 w-3.5" />} />
              <Info label="Contact source" value={prospect.source} />
              <div className="md:col-span-2"><Info label="Active evidence" value={prospect.active_evidence} /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Website audit</CardTitle>
              <CardDescription>Sinyal audit dan rekomendasi improvement untuk outreach.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Info label="Website audit signal" value={prospect.website_audit_signal} />
              <Info label="Problem summary" value={audit?.problem_summary ?? prospect.website_audit_signal} />
              <Info label="Recommendation" value={audit?.recommendation ?? prospect.offer_angle} />
              <div className="grid gap-3 md:grid-cols-2">
                <Info label="Audit status" value={audit?.audit_status ?? 'Not Started'} />
                <Info label="Mockup link" value={audit?.mockup_url || 'Belum ada'} />
              </div>
              {audit?.mockup_html || audit?.mockup_url ? (
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
                    AI Web Mockup
                  </div>
                  <MockupThumbnail
                    html={audit?.mockup_html}
                    url={audit?.mockup_url}
                    fallback={Boolean(audit?.mockup_fallback)}
                    generatedAt={audit?.mockup_generated_at ?? null}
                  />
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Communication timeline</CardTitle>
              <CardDescription>Catatan semua interaksi dengan prospek.</CardDescription>
            </CardHeader>
            <CardContent>
              {communications.length ? (
                <div className="space-y-4">
                  {communications.map((c) => (
                    <div key={c.id} className="relative border-l-2 border-emerald-200 pl-4">
                      <div className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-white" />
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>{formatDateTime(c.created_at)}</span>
                        <span>·</span>
                        <span>{c.channel}</span>
                        <span>·</span>
                        <span>{c.direction}</span>
                      </div>
                      <div className="mt-1 font-medium text-slate-950">{c.message_summary}</div>
                      {c.response_summary ? <div className="mt-1 text-sm text-slate-600">Response: {c.response_summary}</div> : null}
                      <div className="mt-2"><StatusBadge status={c.status_after} /></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Belum ada komunikasi. Mulai dari tombol Mark as Contacted.</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Chat / outreach tracking</CardTitle>
              <CardDescription>Update status dan catat hasil chat secara cepat.</CardDescription>
            </CardHeader>
            <CardContent>
              <ProspectActions prospect={prospect} sales={sales} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Follow up</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Info label="Next follow up date" value={formatDate(prospect.next_follow_up_at)} />
              {followUps.length ? followUps.map((f) => (
                <div key={f.id} className="rounded-xl border border-slate-100 p-3">
                  <div className="text-sm font-semibold text-slate-950">{formatDateTime(f.follow_up_date)}</div>
                  <div className="mt-1 text-sm text-slate-600">{f.reason}</div>
                  <div className="mt-1 text-xs text-slate-500">Status: {f.status}</div>
                </div>
              )) : <div className="text-sm text-slate-500">Tidak ada follow up terjadwal.</div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Deal info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Info label="Estimated budget" value="Belum diisi" />
              <Info label="Service offered" value={prospect.offer_angle} />
              <Info label="Proposal link" value="Belum ada" />
              <Info label="Deal value" value={prospect.status === 'Deal' ? 'Perlu input nilai deal' : '—'} />
              <Info label="Close date" value="—" />
              <Info label="Reason rejected" value={prospect.status === 'Rejected' ? prospect.notes || 'Tidak tertarik' : '—'} />
            </CardContent>
          </Card>

          <Button asChild variant="outline" className="w-full">
            <Link href="/prospects">← Kembali ke prospects</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

function Info({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{icon}{label}</div>
      <div className="text-sm leading-6 text-slate-700">{value || '—'}</div>
    </div>
  )
}
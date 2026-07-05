import { NextResponse } from 'next/server'
import { guardMutation } from '@/lib/auth/api-guard'
import { allocateMockupJobId, ensureAuditForMockupGeneration, getProspect } from '@/lib/data/queries'
import { enqueueGenerateJob, runJob } from '@/lib/ai/jobs'

export const runtime = 'nodejs'
// Request itself is fast (just enqueues) so we don't need a large maxDuration.
// The AI work happens out-of-band in the in-memory worker.
export const maxDuration = 60

interface GenerateBody {
  prospect_id?: string
  audit_id?: string | null
  brief?: string
}

export async function POST(request: Request) {
  const guard = await guardMutation()
  if (guard.response) return guard.response

  const body = (await request.json().catch(() => ({}))) as GenerateBody
  if (!body.prospect_id) {
    return NextResponse.json({ error: 'prospect_id wajib diisi' }, { status: 400 })
  }

  // Validate prospect exists before enqueuing so we fail fast on bad input.
  const prospect = await getProspect(body.prospect_id)
  if (!prospect) {
    return NextResponse.json({ error: 'Prospect tidak ditemukan' }, { status: 404 })
  }

  const jobId = allocateMockupJobId()
  const audit = await ensureAuditForMockupGeneration({
    auditId: body.audit_id ?? null,
    prospectId: body.prospect_id,
    jobId,
  })

  const job = enqueueGenerateJob({
    jobId,
    prospectId: body.prospect_id,
    auditId: audit?.id ?? body.audit_id ?? null,
    brief: body.brief ?? null,
  })
  // If running on Vercel (serverless ephemeral), process inline to avoid relying on an in-memory worker.
  if (process.env.VERCEL) {
    try {
      const result = await runJob(job)
      return NextResponse.json({
        job_id: job.id,
        audit_id: audit?.id ?? null,
        status: 'done',
        poll_url: `/api/mockups/status/${job.id}`,
        result,
      })
    } catch (err) {
      return NextResponse.json({
        job_id: job.id,
        audit_id: audit?.id ?? null,
        status: 'failed',
        poll_url: `/api/mockups/status/${job.id}`,
        error: err instanceof Error ? err.message : String(err),
      }, { status: 500 })
    }
  }

  return NextResponse.json({
    job_id: job.id,
    audit_id: audit?.id ?? null,
    status: job.status,
    poll_url: `/api/mockups/status/${job.id}`,
  })
}
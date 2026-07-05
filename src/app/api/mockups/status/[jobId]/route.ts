import { NextResponse } from 'next/server'
import { guardMutation } from '@/lib/auth/api-guard'
import { getGenerateJob, type JobState } from '@/lib/ai/jobs'

export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  { params }: { params: { jobId: string } },
) {
  const guard = await guardMutation()
  if (guard.response) return guard.response

  const job = getGenerateJob(params.jobId)
  if (!job) {
    // Server restart (or job pruned) wipes the in-memory queue. Tell the
    // client it should fall back to a scaffold and let the user re-run.
    return NextResponse.json({
      id: params.jobId,
      status: 'unknown' as JobState,
      result: null,
      error: 'Job tidak ditemukan di server — kemungkinan server di-restart saat job berjalan.',
    })
  }

  return NextResponse.json({
    id: job.id,
    status: job.status,
    started_at: job.startedAt,
    finished_at: job.finishedAt,
    result: job.result ?? null,
    error: job.error ?? null,
    error_code: job.errorCode ?? null,
  })
}
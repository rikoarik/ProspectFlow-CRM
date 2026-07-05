import { NextResponse } from 'next/server'
import { guardMutation } from '@/lib/auth/api-guard'
import { getGenerateJob, type JobState } from '@/lib/ai/jobs'
import {
  buildMockupStatusResult,
  derivePersistedMockupStatus,
  getAuditByMockupJobId,
  getPersistedMockupStatusError,
  getPersistedMockupStatusErrorCode,
  hasPersistedMockupStatus,
  toMockupStatusTimestamps,
} from '@/lib/data/queries'

export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  { params }: { params: { jobId: string } },
) {
  const guard = await guardMutation()
  if (guard.response) return guard.response

  const job = getGenerateJob(params.jobId)
  if (job) {
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

  const audit = await getAuditByMockupJobId(params.jobId)
  if (audit && hasPersistedMockupStatus(audit)) {
    const status = derivePersistedMockupStatus(audit)
    const timestamps = toMockupStatusTimestamps(audit)
    return NextResponse.json({
      id: params.jobId,
      status: status as JobState | 'unknown',
      started_at: timestamps.started_at,
      finished_at: timestamps.finished_at,
      result: status === 'done' ? buildMockupStatusResult(audit) : null,
      error: getPersistedMockupStatusError(audit),
      error_code: getPersistedMockupStatusErrorCode(audit),
    })
  }

  return NextResponse.json({
    id: params.jobId,
    status: 'unknown' as JobState | 'unknown',
    result: null,
    error: 'Status job tidak bisa dipulihkan dari server. Coba regenerate mockup.',
    error_code: null,
    started_at: null,
    finished_at: null,
  })
}
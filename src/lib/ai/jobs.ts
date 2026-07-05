import 'server-only'
import { getProspect, saveAuditMockup } from '@/lib/data/queries'
import { AiError, chatCompletion } from '@/lib/ai/client'
import { buildMockupPrompt, buildSystemPrompt, buildUserPrompt } from '@/lib/ai/prompt'
import { buildScaffold } from '@/lib/ai/fallback'
import { sanitizeHtmlForStorage } from '@/lib/ai/sanitize'
import { uploadMockup } from '@/lib/mockups/storage'
import { isAiConfigured } from '@/lib/env'

export type JobState = 'queued' | 'running' | 'done' | 'failed'

export interface JobResult {
  html: string
  url: string
  path: string | null
  fallback: boolean
  warning: string | null
  audit_id: string | null
  model: string | null
}

export interface GenerateJob {
  id: string
  prospectId: string
  auditId: string | null
  brief: string | null
  status: JobState
  startedAt: number | null
  finishedAt: number | null
  result?: JobResult
  error?: string
  errorCode?: string
}

interface JobQueueState {
  jobs: Map<string, GenerateJob>
  order: string[]
  processing: boolean
  nextId: number
}

const JOB_TTL_MS = 60 * 60 * 1000 // 1 hour
const MAX_JOBS_KEPT = 50

declare global {
  // eslint-disable-next-line no-var
  var __prospectflowAiJobQueue: JobQueueState | undefined
}

function getQueue(): JobQueueState {
  if (!globalThis.__prospectflowAiJobQueue) {
    globalThis.__prospectflowAiJobQueue = {
      jobs: new Map(),
      order: [],
      processing: false,
      nextId: 0,
    }
  }
  return globalThis.__prospectflowAiJobQueue
}

export interface EnqueueInput {
  prospectId: string
  auditId: string | null
  brief: string | null
}

export function enqueueGenerateJob(input: EnqueueInput): GenerateJob {
  const queue = getQueue()
  pruneOldJobs(queue)
  queue.nextId += 1
  const id = `job_${Date.now().toString(36)}_${queue.nextId.toString(36)}`
  const job: GenerateJob = {
    id,
    prospectId: input.prospectId,
    auditId: input.auditId,
    brief: input.brief,
    status: 'queued',
    startedAt: null,
    finishedAt: null,
  }
  queue.jobs.set(id, job)
  queue.order.push(id)
  void runQueue()
  return job
}

export function getGenerateJob(id: string): GenerateJob | null {
  const queue = getQueue()
  return queue.jobs.get(id) ?? null
}

function pruneOldJobs(queue: JobQueueState) {
  const now = Date.now()
  // Remove jobs older than TTL
  for (const id of queue.order) {
    const job = queue.jobs.get(id)
    if (!job) continue
    const ref = job.finishedAt ?? job.startedAt ?? 0
    if (now - ref > JOB_TTL_MS) {
      queue.jobs.delete(id)
    }
  }
  // Recompute order to drop removed ids
  queue.order = queue.order.filter((id) => queue.jobs.has(id))
  // Cap the in-memory size to avoid unbounded growth in long-running processes
  while (queue.order.length > MAX_JOBS_KEPT) {
    const oldest = queue.order.shift()
    if (oldest) queue.jobs.delete(oldest)
  }
}

async function runQueue() {
  const queue = getQueue()
  if (queue.processing) return
  queue.processing = true
  try {
    while (true) {
      const next = queue.order.find((id) => queue.jobs.get(id)?.status === 'queued')
      if (!next) break
      const job = queue.jobs.get(next)
      if (!job) {
        queue.order = queue.order.filter((id) => id !== next)
        continue
      }
      job.status = 'running'
      job.startedAt = Date.now()
      try {
        job.result = await runJob(job)
        job.status = 'done'
        job.finishedAt = Date.now()
      } catch (err) {
        const code = err instanceof AiError ? err.code : undefined
        const message =
          err instanceof Error ? err.message : 'AI job failed with unknown error'
        job.error = message
        job.errorCode = code
        job.status = 'failed'
        job.finishedAt = Date.now()
      }
    }
  } finally {
    queue.processing = false
  }
}

async function runJob(job: GenerateJob): Promise<JobResult> {
  const prospect = await getProspect(job.prospectId)
  if (!prospect) {
    throw new Error(`Prospect ${job.prospectId} tidak ditemukan`)
  }

  const input = buildMockupPrompt(prospect)
  let html = ''
  let fallback = false
  let aiError: string | null = null

  if (isAiConfigured()) {
    try {
      const raw = await chatCompletion({
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: buildUserPrompt(input, job.brief ?? undefined) },
        ],
        temperature: 0.7,
        maxTokens: 4096,
      })
      html = sanitizeHtmlForStorage(extractHtml(raw))
    } catch (err) {
      const code =
        err instanceof AiError ? err.code : err instanceof Error ? 'unknown' : 'unknown'
      const message = err instanceof Error ? err.message : 'AI error'
      aiError = `${code}: ${message}`
      html = sanitizeHtmlForStorage(buildScaffold(prospect))
      fallback = true
    }
  } else {
    html = sanitizeHtmlForStorage(buildScaffold(prospect))
    fallback = true
    aiError = 'missing_key: OPENAI_API_KEY belum diisi di .env.local'
  }

  if (html.length > 256 * 1024) {
    throw new Error('HTML hasil generate melebihi 256 KB')
  }

  let url = ''
  let uploadPath: string | null = null
  try {
    const result = await uploadMockup(prospect.id, job.auditId, html)
    if (result) {
      url = result.publicUrl
      uploadPath = result.path
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown'
    aiError = `${aiError ? `${aiError} · ` : ''}upload gagal: ${message}`
  }

  const audit = await saveAuditMockup({
    auditId: job.auditId,
    prospectId: prospect.id,
    url,
    html,
    fallback,
  })

  return {
    html,
    url,
    path: uploadPath,
    fallback,
    warning: aiError,
    audit_id: audit?.id ?? null,
    model: process.env.OPENAI_MODEL ?? null,
  }
}

function extractHtml(raw: string): string {
  const fenced = raw.match(/```(?:html)?\s*([\s\S]*?)```/i)
  if (fenced) return fenced[1].trim()
  return raw.trim()
}
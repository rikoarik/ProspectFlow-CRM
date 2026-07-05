import { getSupabaseServerClient } from '@/lib/supabase/server'
import { scopeProspectsByRole, type Scope } from '@/lib/auth/scoping'
import { getSession } from '@/lib/auth/server'
import type {
  Audit,
  Communication,
  FollowUp,
  MessageTemplate,
  MockupGenerationStatus,
  Prospect,
  ProspectStatus,
  Sales,
} from '@/lib/types'

function client() {
  const sb = getSupabaseServerClient()
  if (!sb) {
    throw new Error('Supabase is not configured')
  }
  return sb
}

function throwIfError(error: unknown, operation: string): asserts error is null | undefined {
  if (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error)
    throw new Error(`${operation} failed: ${message}`)
  }
}

function text(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function normalizeProspect(row: Partial<Prospect> & Record<string, unknown>): Prospect {
  return {
    id: text(row.id),
    company_name: text(row.company_name),
    industry: text(row.industry),
    city: text(row.city),
    website: text(row.website),
    email: text(row.email),
    phone: text(row.phone),
    contact_person: text(row.contact_person),
    source: text(row.source),
    priority: (row.priority as Prospect['priority']) ?? 'C',
    active_confidence: (row.active_confidence as Prospect['active_confidence']) ?? 'Medium',
    active_evidence: text(row.active_evidence),
    website_audit_signal: text(row.website_audit_signal),
    offer_angle: text(row.offer_angle),
    assigned_to: (row.assigned_to as string | null) ?? null,
    status: (row.status as ProspectStatus) ?? 'New',
    first_channel: (row.first_channel as Prospect['first_channel']) ?? 'WhatsApp',
    last_contacted_at: (row.last_contacted_at as string | null) ?? null,
    next_follow_up_at: (row.next_follow_up_at as string | null) ?? null,
    notes: text(row.notes),
    created_at: text(row.created_at),
    updated_at: text(row.updated_at),
  }
}

function normalizeProspects(rows: unknown[] | null | undefined) {
  return (rows ?? []).map((row) => normalizeProspect(row as Record<string, unknown>))
}

function normalizeAudit(row: Record<string, unknown>): Audit {
  return {
    id: text(row.id),
    prospect_id: text(row.prospect_id),
    problem_summary: text(row.problem_summary),
    mobile_issue: Boolean(row.mobile_issue),
    cta_issue: Boolean(row.cta_issue),
    performance_issue: Boolean(row.performance_issue),
    trust_issue: Boolean(row.trust_issue),
    copywriting_issue: Boolean(row.copywriting_issue),
    recommendation: text(row.recommendation),
    audit_status: (row.audit_status as Audit['audit_status']) ?? 'Not Started',
    audit_file_url: text(row.audit_file_url),
    mockup_url: text(row.mockup_url),
    mockup_html: typeof row.mockup_html === 'string' ? row.mockup_html : undefined,
    mockup_fallback: Boolean(row.mockup_fallback),
    mockup_generated_at: (row.mockup_generated_at as string | null) ?? null,
    mockup_job_id: (row.mockup_job_id as string | null) ?? null,
    mockup_generation_status: (row.mockup_generation_status as MockupGenerationStatus | null) ?? null,
    mockup_generation_error: (row.mockup_generation_error as string | null) ?? null,
    mockup_generation_error_code: (row.mockup_generation_error_code as string | null) ?? null,
    mockup_generation_started_at: (row.mockup_generation_started_at as string | null) ?? null,
    mockup_generation_finished_at: (row.mockup_generation_finished_at as string | null) ?? null,
  }
}

function mockupGenerationQueuedPatch(jobId: string, now: string) {
  return {
    mockup_job_id: jobId,
    mockup_generation_status: 'queued' as MockupGenerationStatus,
    mockup_generation_error: null,
    mockup_generation_error_code: null,
    mockup_generation_started_at: null,
    mockup_generation_finished_at: null,
    updated_at: now,
  }
}

function mockupGenerationRunningPatch(now: string) {
  return {
    mockup_generation_status: 'running' as MockupGenerationStatus,
    mockup_generation_error: null,
    mockup_generation_error_code: null,
    mockup_generation_started_at: now,
    mockup_generation_finished_at: null,
    updated_at: now,
  }
}

function mockupGenerationFailedPatch(now: string, error: string, errorCode: string | null) {
  return {
    mockup_generation_status: 'failed' as MockupGenerationStatus,
    mockup_generation_error: error,
    mockup_generation_error_code: errorCode,
    mockup_generation_finished_at: now,
    updated_at: now,
  }
}

function mockupGenerationDonePatch(now: string) {
  return {
    mockup_generation_status: 'done' as MockupGenerationStatus,
    mockup_generation_error: null,
    mockup_generation_error_code: null,
    mockup_generation_finished_at: now,
    updated_at: now,
  }
}

function normalizeAudits(rows: unknown[] | null | undefined): Audit[] {
  return (rows ?? []).map((row) => normalizeAudit(row as Record<string, unknown>))
}

function statusPatch(status: ProspectStatus) {
  const now = new Date().toISOString()
  const patch: Partial<Prospect> = { status, updated_at: now }
  if (['Contacted', 'Replied', 'Interested', 'Proposal Sent', 'Deal', 'Rejected'].includes(status)) {
    patch.last_contacted_at = now
  }
  return patch
}

export async function getCurrentScope(): Promise<Scope | null> {
  const session = await getSession()
  if (!session?.profile) return null
  return { userId: session.profile.id, role: session.profile.role }
}

export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

export async function getProspects(): Promise<Prospect[]> {
  const { data, error } = await client().from('prospects').select('*')
  throwIfError(error, 'Load prospects')
  const rows = normalizeProspects(data)
  return scopeProspectsByRole(rows, await getCurrentScope())
}

export async function getProspect(id: string): Promise<Prospect | null> {
  const { data, error } = await client().from('prospects').select('*').eq('id', id).maybeSingle()
  throwIfError(error, 'Load prospect')
  return data ? normalizeProspect(data as Record<string, unknown>) : null
}

export async function getSales(): Promise<Sales[]> {
  const { data, error } = await client().from('profiles').select('id, full_name, email, role')
  throwIfError(error, 'Load sales')
  return (data as Sales[]) ?? []
}

export async function getSalesById(id: string | null): Promise<Sales | null> {
  if (!id) return null
  const sales = await getSales()
  return sales.find((s) => s.id === id) ?? null
}

export async function getCommunications(prospectId: string): Promise<Communication[]> {
  const { data, error } = await client()
    .from('communications')
    .select('*')
    .eq('prospect_id', prospectId)
    .order('created_at', { ascending: false })
  throwIfError(error, 'Load communications')
  return (data as Communication[]) ?? []
}

export async function getFollowUps(): Promise<FollowUp[]> {
  const { data, error } = await client().from('follow_ups').select('*')
  throwIfError(error, 'Load follow ups')
  return (data as FollowUp[]) ?? []
}

export async function getFollowUpsByProspect(prospectId: string): Promise<FollowUp[]> {
  const { data, error } = await client().from('follow_ups').select('*').eq('prospect_id', prospectId)
  throwIfError(error, 'Load prospect follow ups')
  return (data as FollowUp[]) ?? []
}

export async function getAudits(): Promise<Audit[]> {
  const { data, error } = await client().from('audits').select('*')
  throwIfError(error, 'Load audits')
  return normalizeAudits(data)
}

export async function getAuditByProspect(prospectId: string): Promise<Audit | null> {
  const { data, error } = await client()
    .from('audits')
    .select('*')
    .eq('prospect_id', prospectId)
    .order('updated_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  throwIfError(error, 'Load prospect audit')
  return data ? normalizeAudit(data as Record<string, unknown>) : null
}

export async function getAuditById(id: string): Promise<Audit | null> {
  const { data, error } = await client().from('audits').select('*').eq('id', id).maybeSingle()
  throwIfError(error, 'Load audit')
  return data ? normalizeAudit(data as Record<string, unknown>) : null
}

export async function getAuditByMockupJobId(jobId: string): Promise<Audit | null> {
  const { data, error } = await client().from('audits').select('*').eq('mockup_job_id', jobId).maybeSingle()
  throwIfError(error, 'Load audit by mockup job id')
  return data ? normalizeAudit(data as Record<string, unknown>) : null
}

export async function ensureAuditForMockupGeneration(input: {
  auditId: string | null
  prospectId: string
  jobId: string
}): Promise<Audit | null> {
  const now = new Date().toISOString()
  const patch = mockupGenerationQueuedPatch(input.jobId, now)

  if (input.auditId) {
    const { data, error } = await client().from('audits').update(patch).eq('id', input.auditId).select().single()
    throwIfError(error, 'Queue audit mockup generation')
    return data ? normalizeAudit(data as Record<string, unknown>) : null
  }

  const { data, error } = await client()
    .from('audits')
    .insert({
      prospect_id: input.prospectId,
      audit_status: 'Draft',
      ...patch,
    })
    .select()
    .single()
  throwIfError(error, 'Create audit for mockup generation')
  return data ? normalizeAudit(data as Record<string, unknown>) : null
}

export async function markAuditMockupJobRunning(auditId: string) {
  const now = new Date().toISOString()
  const { error } = await client().from('audits').update(mockupGenerationRunningPatch(now)).eq('id', auditId)
  throwIfError(error, 'Mark audit mockup generation running')
}

export async function markAuditMockupJobFailed(input: {
  auditId: string
  error: string
  errorCode: string | null
}) {
  const now = new Date().toISOString()
  const { error } = await client()
    .from('audits')
    .update(mockupGenerationFailedPatch(now, input.error, input.errorCode))
    .eq('id', input.auditId)
  throwIfError(error, 'Mark audit mockup generation failed')
}

export async function getTemplates(): Promise<MessageTemplate[]> {
  const { data, error } = await client().from('message_templates').select('*')
  throwIfError(error, 'Load templates')
  return (data as MessageTemplate[]) ?? []
}

export async function setProspectStatus(id: string, status: ProspectStatus) {
  const patch = statusPatch(status)
  const { data, error } = await client().from('prospects').update(patch).eq('id', id).select().single()
  throwIfError(error, 'Update prospect status')
  return data ? normalizeProspect(data as Record<string, unknown>) : null
}

export async function patchProspect(id: string, patch: Partial<Prospect>) {
  const { data, error } = await client().from('prospects').update(patch).eq('id', id).select().single()
  throwIfError(error, 'Update prospect')
  return data ? normalizeProspect(data as Record<string, unknown>) : null
}

export async function bulkSetStatus(ids: string[], status: ProspectStatus) {
  const patch = statusPatch(status)
  const { data, error } = await client().from('prospects').update(patch).in('id', ids).select()
  throwIfError(error, 'Bulk update prospect status')
  return normalizeProspects(data)
}

export async function logCommunication(input: Omit<Communication, 'id' | 'created_at'>) {
  const { data, error } = await client().from('communications').insert(input).select().single()
  throwIfError(error, 'Log communication')
  return (data as Communication | null) ?? null
}

export async function scheduleFollowUp(input: Omit<FollowUp, 'id'>) {
  const { data, error } = await client().from('follow_ups').insert(input).select().single()
  throwIfError(error, 'Schedule follow up')
  const { error: prospectError } = await client()
    .from('prospects')
    .update({ next_follow_up_at: input.follow_up_date, status: 'Need Follow Up' })
    .eq('id', input.prospect_id)
  throwIfError(prospectError, 'Update prospect follow up date')
  return (data as FollowUp | null) ?? null
}

export async function completeFollowUp(id: string, notes: string) {
  const { data, error } = await client().from('follow_ups').update({ status: 'Done', notes }).eq('id', id).select().single()
  throwIfError(error, 'Complete follow up')
  if (data?.prospect_id) {
    const { data: next, error: nextError } = await client()
      .from('follow_ups')
      .select('follow_up_date')
      .eq('prospect_id', data.prospect_id)
      .neq('status', 'Done')
      .order('follow_up_date', { ascending: true })
      .limit(1)
      .maybeSingle()
    throwIfError(nextError, 'Load next follow up')
    const { error: prospectError } = await client()
      .from('prospects')
      .update({ next_follow_up_at: next?.follow_up_date ?? null })
      .eq('id', data.prospect_id)
    throwIfError(prospectError, 'Update prospect next follow up')
  }
  return (data as FollowUp | null) ?? null
}

export async function rescheduleFollowUp(id: string, followUpDate: string) {
  const { data, error } = await client().from('follow_ups').update({ follow_up_date: followUpDate, status: 'Rescheduled' }).eq('id', id).select().single()
  throwIfError(error, 'Reschedule follow up')
  if (data?.prospect_id) {
    const { error: prospectError } = await client()
      .from('prospects')
      .update({ next_follow_up_at: followUpDate })
      .eq('id', data.prospect_id)
    throwIfError(prospectError, 'Update prospect rescheduled follow up')
  }
  return (data as FollowUp | null) ?? null
}

export async function importProspectsViaCsv(
  rows: Omit<Prospect, 'id' | 'created_at' | 'updated_at'>[],
) {
  const { data, error } = await client().from('prospects').insert(rows).select()
  throwIfError(error, 'Import prospects')
  return normalizeProspects(data)
}

export async function saveAuditMockup(input: {
  auditId: string | null
  prospectId: string
  url: string
  html: string
  fallback: boolean
}): Promise<Audit | null> {
  const generatedAt = new Date().toISOString()
  const donePatch = mockupGenerationDonePatch(generatedAt)

  if (input.auditId) {
    const { data, error } = await client()
      .from('audits')
      .update({
        mockup_url: input.url,
        mockup_html: input.html,
        mockup_fallback: input.fallback,
        mockup_generated_at: generatedAt,
        ...donePatch,
      })
      .eq('id', input.auditId)
      .select()
      .single()
    throwIfError(error, 'Update audit mockup')
    return data ? normalizeAudit(data as Record<string, unknown>) : null
  }

  const { data, error } = await client()
    .from('audits')
    .insert({
      prospect_id: input.prospectId,
      mockup_url: input.url,
      mockup_html: input.html,
      mockup_fallback: input.fallback,
      mockup_generated_at: generatedAt,
      audit_status: 'Draft',
      ...donePatch,
    })
    .select()
    .single()
  throwIfError(error, 'Insert audit mockup')
  return data ? normalizeAudit(data as Record<string, unknown>) : null
}

export function buildMockupStatusResult(audit: Audit) {
  return {
    html: audit.mockup_html ?? '',
    url: audit.mockup_url ?? '',
    path: null,
    fallback: Boolean(audit.mockup_fallback),
    warning: audit.mockup_generation_error ?? null,
    audit_id: audit.id,
    model: process.env.OPENAI_MODEL ?? null,
  }
}

export function toMockupStatusTimestamps(audit: Audit) {
  return {
    started_at: audit.mockup_generation_started_at ? Date.parse(audit.mockup_generation_started_at) : null,
    finished_at: audit.mockup_generation_finished_at ? Date.parse(audit.mockup_generation_finished_at) : null,
  }
}

export function derivePersistedMockupStatus(audit: Audit) {
  if (audit.mockup_generation_status === 'failed') return 'failed' as const
  if (audit.mockup_html && audit.mockup_generated_at) return 'done' as const
  if (audit.mockup_generation_status === 'running') return 'running' as const
  if (audit.mockup_generation_status === 'queued') return 'queued' as const
  return 'unknown' as const
}

export function getPersistedMockupStatusError(audit: Audit) {
  if (audit.mockup_generation_status === 'failed') {
    return audit.mockup_generation_error ?? 'AI job gagal.'
  }
  return null
}

export function getPersistedMockupStatusErrorCode(audit: Audit) {
  return audit.mockup_generation_status === 'failed' ? audit.mockup_generation_error_code ?? null : null
}

export function hasPersistedMockupStatus(audit: Audit) {
  return Boolean(audit.mockup_job_id || audit.mockup_html || audit.mockup_generation_status)
}

export function createMockupJobId(seed: number) {
  return `job_${Date.now().toString(36)}_${seed.toString(36)}`
}

let nextMockupJobId = 0

export function allocateMockupJobId() {
  nextMockupJobId += 1
  return createMockupJobId(nextMockupJobId)
}

export function resetMockupJobIdCounterForTests() {
  nextMockupJobId = 0
}

export type PersistedMockupStatus = ReturnType<typeof derivePersistedMockupStatus>

export type MockupStatusResult = ReturnType<typeof buildMockupStatusResult>

export type MockupStatusTimestamps = ReturnType<typeof toMockupStatusTimestamps>

export type EnsureAuditForMockupGenerationInput = Parameters<typeof ensureAuditForMockupGeneration>[0]

export type MarkAuditMockupJobFailedInput = Parameters<typeof markAuditMockupJobFailed>[0]

export type SaveAuditMockupInput = Parameters<typeof saveAuditMockup>[0]

export type SaveAuditMockupResult = Awaited<ReturnType<typeof saveAuditMockup>>

export type AuditByMockupJobIdResult = Awaited<ReturnType<typeof getAuditByMockupJobId>>

export type AuditByIdResult = Awaited<ReturnType<typeof getAuditById>>

export type AuditByProspectResult = Awaited<ReturnType<typeof getAuditByProspect>>

export type EnsureAuditForMockupGenerationResult = Awaited<ReturnType<typeof ensureAuditForMockupGeneration>>

export type MarkAuditMockupJobRunningResult = Awaited<ReturnType<typeof markAuditMockupJobRunning>>

export type MarkAuditMockupJobFailedResult = Awaited<ReturnType<typeof markAuditMockupJobFailed>>

export type PersistedMockupStatusError = ReturnType<typeof getPersistedMockupStatusError>

export type PersistedMockupStatusErrorCode = ReturnType<typeof getPersistedMockupStatusErrorCode>

export type HasPersistedMockupStatus = ReturnType<typeof hasPersistedMockupStatus>

export type AllocateMockupJobId = typeof allocateMockupJobId

export type CreateMockupJobId = typeof createMockupJobId

export type ResetMockupJobIdCounterForTests = typeof resetMockupJobIdCounterForTests

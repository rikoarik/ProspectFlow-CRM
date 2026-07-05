export type Priority = 'A' | 'B' | 'C'
export type ActiveConfidence = 'High' | 'Medium' | 'Low'

export const PROSPECT_STATUSES = [
  'New',
  'Need Review',
  'Ready to Contact',
  'Contacted',
  'Replied',
  'Interested',
  'Need Follow Up',
  'Proposal Sent',
  'Deal',
  'Rejected',
  'No Response',
  'Archived',
] as const

export type ProspectStatus = (typeof PROSPECT_STATUSES)[number]

export const PIPELINE_STATUSES: ProspectStatus[] = [
  'New',
  'Need Review',
  'Ready to Contact',
  'Contacted',
  'Replied',
  'Interested',
  'Need Follow Up',
  'Proposal Sent',
  'Deal',
  'Rejected',
  'No Response',
  'Archived',
]

export type PipelineView = 'semua' | 'aktif' | 'followup' | 'arsip'

export const PIPELINE_VIEW_STATUSES: Record<PipelineView, ProspectStatus[]> = {
  semua: [
    'New',
    'Need Review',
    'Ready to Contact',
    'Contacted',
    'Replied',
    'Interested',
    'Need Follow Up',
    'Proposal Sent',
    'Deal',
    'Rejected',
    'No Response',
    'Archived',
  ],
  aktif: [
    'New',
    'Need Review',
    'Ready to Contact',
    'Contacted',
    'Replied',
    'Interested',
    'Need Follow Up',
    'Proposal Sent',
    'Deal',
  ],
  followup: ['Contacted', 'Replied', 'Interested', 'Need Follow Up', 'Proposal Sent'],
  arsip: ['Deal', 'Rejected', 'No Response', 'Archived'],
}

export function parsePipelineView(value: string | undefined | null): PipelineView {
  if (value === 'aktif' || value === 'followup' || value === 'arsip') return value
  return 'semua'
}

export function filterStatusesByView<T extends ProspectStatus>(
  statuses: readonly T[],
  view: PipelineView,
): T[] {
  const allowed = new Set<ProspectStatus>(PIPELINE_VIEW_STATUSES[view])
  return statuses.filter((status) => allowed.has(status as ProspectStatus))
}

export const CHANNELS = ['WhatsApp', 'Email', 'Phone', 'LinkedIn'] as const
export type Channel = (typeof CHANNELS)[number]

export type Direction = 'Outbound' | 'Inbound'

export interface Sales {
  id: string
  full_name: string
  email: string
  role: 'Admin' | 'Sales'
}

export interface Prospect {
  id: string
  company_name: string
  industry: string
  city: string
  website: string
  email: string
  phone: string
  contact_person: string
  source: string
  priority: Priority
  active_confidence: ActiveConfidence
  active_evidence: string
  website_audit_signal: string
  offer_angle: string
  assigned_to: string | null
  status: ProspectStatus
  first_channel: Channel
  last_contacted_at: string | null
  next_follow_up_at: string | null
  notes: string
  created_at: string
  updated_at: string
}

export interface Communication {
  id: string
  prospect_id: string
  sales_id: string | null
  channel: Channel
  direction: Direction
  message_summary: string
  response_summary: string
  status_after: ProspectStatus
  created_at: string
}

export interface FollowUp {
  id: string
  prospect_id: string
  sales_id: string | null
  follow_up_date: string
  reason: string
  status: 'Pending' | 'Done' | 'Rescheduled'
  notes: string
}

export interface Audit {
  id: string
  prospect_id: string
  problem_summary: string
  mobile_issue: boolean
  cta_issue: boolean
  performance_issue: boolean
  trust_issue: boolean
  copywriting_issue: boolean
  recommendation: string
  audit_status: 'Not Started' | 'Draft' | 'Sent' | 'Approved'
  audit_file_url: string
  mockup_url: string
  mockup_html?: string
  mockup_fallback?: boolean
  mockup_generated_at?: string | null
}

export interface MockupRef {
  prospect_id: string
  audit_id: string | null
  url: string
  html: string
  fallback: boolean
  generated_at: string
}

export interface MessageTemplate {
  id: string
  title: string
  channel: Channel
  category: string
  content: string
}

export interface Attachment {
  id: string
  prospect_id: string
  file_name: string
  file_url: string
  file_type: string
  created_at: string
}

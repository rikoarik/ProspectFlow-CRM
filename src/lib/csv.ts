import Papa from 'papaparse'
import { PROSPECT_STATUSES, type ActiveConfidence, type Priority, type Prospect, type ProspectStatus } from '@/lib/types'

const STATUS_ALIASES: Record<string, ProspectStatus> = {
  'not contacted': 'New',
  new: 'New',
  'need review': 'Need Review',
  'ready to contact': 'Ready to Contact',
  contacted: 'Contacted',
  replied: 'Replied',
  interested: 'Interested',
  followup: 'Need Follow Up',
  'follow up': 'Need Follow Up',
  'need follow up': 'Need Follow Up',
  'proposal sent': 'Proposal Sent',
  deal: 'Deal',
  rejected: 'Rejected',
  'no response': 'No Response',
  archived: 'Archived',
}

const CONFIDENCE_ALIASES: Record<string, ActiveConfidence> = {
  a: 'High',
  high: 'High',
  b: 'Medium',
  medium: 'Medium',
  c: 'Low',
  low: 'Low',
}

function value(row: Record<string, unknown>, ...keys: string[]) {
  const lowered = Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k.trim().toLowerCase().replace(/[\s/]+/g, '_'), String(v ?? '').trim()]),
  )
  for (const key of keys) {
    const normalized = key.toLowerCase().replace(/[\s/]+/g, '_')
    if (lowered[normalized]) return lowered[normalized]
  }
  return ''
}

export interface CsvPreviewRow {
  rowNumber: number
  company_name: string
  industry: string
  city: string
  website: string
  email: string
  phone: string
  source: string
  priority: Priority
  active_confidence: ActiveConfidence
  active_evidence: string
  website_audit_signal: string
  offer_angle: string
  status: ProspectStatus
  notes: string
  errors: string[]
}

export function parseProspectCsv(file: File): Promise<CsvPreviewRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const rows = result.data.map((row, index) => mapCsvRow(row, index + 2))
        resolve(rows)
      },
      error: reject,
    })
  })
}

export function mapCsvRow(row: Record<string, unknown>, rowNumber: number): CsvPreviewRow {
  const priorityRaw = value(row, 'priority').toUpperCase()
  const confidenceRaw = value(row, 'active_confidence', 'active confidence').toLowerCase()
  const statusRaw = value(row, 'status').toLowerCase()
  const errors: string[] = []
  const company = value(row, 'company_name', 'company', 'company name')
  const website = value(row, 'website')
  const email = value(row, 'email')
  if (!company) errors.push('Company wajib diisi')
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.split(/[;,]/)[0].trim())) {
    errors.push('Email tidak valid')
  }
  if (website) {
    try {
      new URL(/^https?:\/\//i.test(website) ? website : `https://${website}`)
    } catch {
      errors.push('Website tidak valid')
    }
  }
  if (priorityRaw && !['A', 'B', 'C'].includes(priorityRaw)) errors.push('Priority harus A/B/C')
  if (confidenceRaw && !CONFIDENCE_ALIASES[confidenceRaw]) errors.push('Active confidence harus High/Medium/Low atau A/B/C')
  if (statusRaw && !STATUS_ALIASES[statusRaw] && !PROSPECT_STATUSES.some((s) => s.toLowerCase() === statusRaw)) {
    errors.push('Status tidak valid')
  }

  const canonicalStatus = PROSPECT_STATUSES.find((s) => s.toLowerCase() === statusRaw)

  return {
    rowNumber,
    company_name: company,
    industry: value(row, 'industry'),
    city: value(row, 'city', 'city_area', 'city / area'),
    website,
    email,
    phone: value(row, 'phone', 'phone_wa', 'phone / whatsapp'),
    source: value(row, 'source', 'contact_source'),
    priority: (['A', 'B', 'C'].includes(priorityRaw) ? priorityRaw : 'C') as Priority,
    active_confidence: CONFIDENCE_ALIASES[confidenceRaw] ?? 'Medium',
    active_evidence: value(row, 'active_evidence', 'active evidence'),
    website_audit_signal: value(row, 'website_audit_signal', 'website audit signal'),
    offer_angle: value(row, 'offer_angle', 'offer angle'),
    status: canonicalStatus ?? STATUS_ALIASES[statusRaw] ?? 'New',
    notes: value(row, 'notes'),
    errors,
  }
}

export function previewToProspectInput(
  row: CsvPreviewRow,
): Omit<Prospect, 'id' | 'created_at' | 'updated_at'> {
  return {
    company_name: row.company_name,
    industry: row.industry,
    city: row.city,
    website: row.website,
    email: row.email,
    phone: row.phone,
    contact_person: '',
    source: row.source,
    priority: row.priority,
    active_confidence: row.active_confidence,
    active_evidence: row.active_evidence,
    website_audit_signal: row.website_audit_signal,
    offer_angle: row.offer_angle,
    assigned_to: null,
    status: row.status,
    first_channel: 'WhatsApp',
    last_contacted_at: null,
    next_follow_up_at: null,
    notes: row.notes,
  }
}
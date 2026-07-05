import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(value?: string | null) {
  if (!value) return '—'
  try {
    const d = new Date(value)
    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return value
  }
}

export function formatDateTime(value?: string | null) {
  if (!value) return '—'
  try {
    const d = new Date(value)
    return d.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return value
  }
}

export function daysFromNow(value?: string | null) {
  if (!value) return null
  const target = new Date(value).getTime()
  const now = Date.now()
  const diffMs = target - now
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

export const TEMPLATE_VARIABLES = [
  'company_name',
  'industry',
  'website',
  'problem_signal',
  'offer_angle',
  'sales_name',
  'contact_person',
] as const

export type TemplateVariables = (typeof TEMPLATE_VARIABLES)[number]

export function interpolateTemplate(
  content: string,
  vars: Partial<Record<TemplateVariables, string>>,
) {
  return content.replace(/\{\{\s*([\w_]+)\s*\}\}/g, (_, key: string) => {
    const v = vars[key as TemplateVariables]
    return v ?? `{{${key}}}`
  })
}

export function extractWhatsAppNumber(phone: string) {
  if (!phone) return null
  const candidates = phone
    .split(/[;|/]|\s+or\s+|\s+atau\s+/i)
    .map((part) => part.replace(/[^0-9+]/g, ''))
    .filter(Boolean)

  for (const candidate of candidates) {
    let digits = candidate.replace(/\+/g, '')
    if (digits.startsWith('0')) digits = `62${digits.slice(1)}`
    if (!digits.startsWith('62')) continue
    // Indonesian mobile/WhatsApp numbers are normally +62 8xx with 10-15 digits.
    if (/^628\d{7,12}$/.test(digits)) return digits
  }
  return null
}

export function buildWhatsAppUrl(phone: string, message: string) {
  const target = extractWhatsAppNumber(phone)
  if (!target) return null
  return `https://wa.me/${target}?text=${encodeURIComponent(message)}`
}

export function safeUrl(url: string) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return `https://${url}`
}

export function pct(num: number, denom: number) {
  if (!denom) return 0
  return Math.round((num / denom) * 100)
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function isValidUrl(url: string) {
  if (!url) return false
  try {
    new URL(safeUrl(url))
    return true
  } catch {
    return false
  }
}
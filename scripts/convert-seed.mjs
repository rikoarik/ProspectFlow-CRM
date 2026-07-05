// Convert pt_prospect_expanded_verified_contacts_2026.xlsx → JSON seed
// Run with: node scripts/convert-seed.mjs
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import * as XLSX from 'xlsx'

const ROOT = process.cwd()
const SRC = path.join(ROOT, 'pt_prospect_expanded_verified_contacts_2026.xlsx')
const OUT_DIR = path.join(ROOT, 'src/lib/seed')

const PRIORITY_MAP = {
  A: 'A',
  B: 'B',
  C: 'C',
}

const CONFIDENCE_MAP = {
  A: 'High',
  B: 'Medium',
  C: 'Low',
  High: 'High',
  Medium: 'Medium',
  Low: 'Low',
}

const STATUS_MAP = {
  'Not contacted': 'New',
  Contacted: 'Contacted',
  Replied: 'Replied',
  Interested: 'Interested',
  Deal: 'Deal',
  Rejected: 'Rejected',
}

function statusFor(raw) {
  if (!raw) return 'New'
  return STATUS_MAP[raw] || 'New'
}

function clean(v) {
  if (v === undefined || v === null) return ''
  return String(v).trim()
}

function firstChannel(row) {
  const c = clean(row['First Channel']).toLowerCase()
  if (c.includes('whatsapp')) return 'WhatsApp'
  if (c.includes('email')) return 'Email'
  if (c.includes('phone')) return 'Phone'
  if (c.includes('linkedin')) return 'LinkedIn'
  return 'WhatsApp'
}

function phones(raw) {
  return clean(raw)
    .split(/[;|]/)
    .map((p) => p.trim())
    .filter(Boolean)
}

function emails(raw) {
  return clean(raw)
    .split(/[;,]/)
    .map((p) => p.trim())
    .filter((p) => p.includes('@'))
}

async function main() {
  const buf = await readFile(SRC)
  const wb = XLSX.read(buf, { type: 'buffer' })
  const sheetName = wb.SheetNames.includes('Combined Database')
    ? 'Combined Database'
    : wb.SheetNames[wb.SheetNames.length - 1]
  const sheet = wb.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })

  const prospects = rows
    .map((row, idx) => {
      const company = clean(row['Company'])
      if (!company) return null
      const priority = PRIORITY_MAP[clean(row['Priority']).toUpperCase()] || 'C'
      const confidence = CONFIDENCE_MAP[clean(row['Active Confidence'])] || 'Medium'
      return {
        id: `prospect-${idx + 1}`,
        company_name: company,
        industry: clean(row['Industry']),
        city: clean(row['City/Area']),
        website: clean(row['Website']),
        email: emails(row['Email']).join(', '),
        phone: phones(row['Phone/WA']).join(' / '),
        contact_person: '',
        source: clean(row['Contact Source']) || clean(row['Batch']),
        priority,
        active_confidence: confidence,
        active_evidence: clean(row['Active Evidence']),
        website_audit_signal: clean(row['Website Audit Signal']),
        offer_angle: clean(row['Offer Angle']),
        assigned_to: null,
        status: statusFor(clean(row['Status'])),
        first_channel: firstChannel(row),
        last_contacted_at: null,
        next_follow_up_at: null,
        notes: clean(row['Notes']),
        created_at: new Date('2026-07-03').toISOString(),
        updated_at: new Date('2026-07-03').toISOString(),
      }
    })
    .filter(Boolean)

  const salesTeam = [
    {
      id: 'sales-1',
      full_name: 'Admin Demo',
      email: 'admin@prospectflow.app',
      role: 'Admin',
    },
    {
      id: 'sales-2',
      full_name: 'Budi Santoso',
      email: 'budi@prospectflow.app',
      role: 'Sales',
    },
    {
      id: 'sales-3',
      full_name: 'Citra Wijaya',
      email: 'citra@prospectflow.app',
      role: 'Sales',
    },
    {
      id: 'sales-4',
      full_name: 'Dimas Pratama',
      email: 'dimas@prospectflow.app',
      role: 'Sales',
    },
  ]

  // Round-robin assignment so dashboard/filter/kanban have real data
  prospects.forEach((p, i) => {
    const sales = salesTeam[1 + (i % 3)]
    p.assigned_to = sales.id
  })

  // Schedule next_follow_up_at for ~30% of prospects to populate Follow Up page
  const today = new Date('2026-07-03T00:00:00Z')
  prospects.forEach((p, i) => {
    if (i % 3 === 0) {
      const offsetDays = (i % 5) - 2 // -2..+2 days around today
      const d = new Date(today.getTime() + offsetDays * 24 * 3600 * 1000)
      p.next_follow_up_at = d.toISOString()
    }
  })

  // Pre-populate last_contacted_at for ~20% prospects
  prospects.forEach((p, i) => {
    if (i % 5 === 0) {
      const d = new Date(today.getTime() - (i % 10) * 24 * 3600 * 1000)
      p.last_contacted_at = d.toISOString()
    }
  })

  const messageTemplates = [
    {
      id: 'tpl-1',
      title: 'First Outreach WhatsApp',
      channel: 'WhatsApp',
      category: 'First Outreach',
      content:
        'Halo Pak/Bu, saya sempat melihat website {{company_name}}. Bisnisnya terlihat aktif dan cukup potensial. Saat saya buka lewat HP, ada beberapa bagian yang menurut saya bisa dibuat lebih mudah untuk calon klien menghubungi tim Bapak/Ibu. Saya coba buat mini audit singkat dan contoh improvement untuk halaman utamanya. Boleh saya kirimkan di sini?',
    },
    {
      id: 'tpl-2',
      title: 'Follow Up 1',
      channel: 'WhatsApp',
      category: 'Follow Up',
      content:
        'Halo {{contact_person}}, ingin follow up pesan sebelumnya terkait website {{company_name}}. Apakah ada waktu singkat untuk melihat contoh improvement yang sudah saya siapkan untuk {{problem_signal}}?\n\nSalam,\n{{sales_name}}',
    },
    {
      id: 'tpl-3',
      title: 'Follow Up 2',
      channel: 'Email',
      category: 'Follow Up',
      content:
        'Subject: Ide singkat untuk {{company_name}}\n\nHalo, saya {{sales_name}} dari tim web specialist. Kami mengaudit website {{company_name}} ({{website}}) dan menemukan beberapa peluang di area {{problem_signal}}. Saya lampirkan mockup singkat untuk halaman utamanya. Boleh dijadwalkan 15 menit minggu ini untuk diskusi?',
    },
    {
      id: 'tpl-4',
      title: 'Email Intro',
      channel: 'Email',
      category: 'Intro',
      content:
        'Subject: Ide {{industry}} singkat untuk {{company_name}}\n\nHalo tim {{company_name}},\n\nSaya {{sales_name}}. Saya baru saja melihat website {{company_name}} di {{website}} dan tertarik dengan bisnis Anda di industri {{industry}}. Saya menyiapkan mini audit gratis yang menunjukkan 3 peluang utama untuk meningkatkan enquiry dari website.\n\nBoleh saya kirimkan ringkasannya?\n\nTerima kasih,\n{{sales_name}}',
    },
    {
      id: 'tpl-5',
      title: 'Kirim Audit Website',
      channel: 'WhatsApp',
      category: 'Audit',
      content:
        'Halo, berikut saya lampirkan mini audit website {{company_name}}. Fokus utama kami adalah {{problem_signal}}. Bila berkenan, kita bisa lanjut ke tahap mockup.',
    },
    {
      id: 'tpl-6',
      title: 'Kirim Proposal',
      channel: 'Email',
      category: 'Proposal',
      content:
        'Subject: Proposal redesign website {{company_name}}\n\nTerima kasih atas waktunya. Saya lampirkan proposal redesign untuk {{company_name}}. Highlight utama: peningkatan CTA WhatsApp, optimasi mobile, dan penawaran {{offer_angle}}.',
    },
    {
      id: 'tpl-7',
      title: 'Closing Reminder',
      channel: 'WhatsApp',
      category: 'Closing',
      content:
        'Halo {{contact_person}}, ingin mengingatkan proposal untuk {{company_name}}. Jika ada pertanyaan atau penyesuaian, saya siap bantu. Semoga kita bisa mulai minggu ini.',
    },
  ]

  const audits = prospects.slice(0, 12).map((p, i) => ({
    id: `audit-${i + 1}`,
    prospect_id: p.id,
    problem_summary: p.website_audit_signal,
    mobile_issue: i % 2 === 0,
    cta_issue: true,
    performance_issue: i % 3 === 0,
    trust_issue: i % 2 === 1,
    copywriting_issue: i % 4 === 0,
    recommendation: p.offer_angle,
    audit_status: i % 3 === 0 ? 'Sent' : i % 3 === 1 ? 'Draft' : 'Not Started',
    audit_file_url: '',
    mockup_url: '',
  }))

  const communications = prospects
    .filter((p) => p.last_contacted_at)
    .slice(0, 30)
    .map((p, i) => ({
      id: `comm-${i + 1}`,
      prospect_id: p.id,
      sales_id: p.assigned_to,
      channel: p.first_channel,
      direction: i % 4 === 0 ? 'Inbound' : 'Outbound',
      message_summary:
        i % 4 === 0
          ? 'Klien membalas dan tertarik dengan audit singkat.'
          : 'Mengirim pesan outreach pertama dan mini audit website.',
      response_summary:
        i % 4 === 0
          ? 'Ingin tahu jadwal diskusi lanjutan.'
          : 'Belum ada balasan.',
      status_after: i % 4 === 0 ? 'Replied' : 'Contacted',
      created_at: p.last_contacted_at,
    }))

  const followUps = prospects
    .filter((p) => p.next_follow_up_at)
    .map((p, i) => ({
      id: `fu-${i + 1}`,
      prospect_id: p.id,
      sales_id: p.assigned_to,
      follow_up_date: p.next_follow_up_at,
      reason: 'Follow up setelah outreach awal',
      status: i % 4 === 0 ? 'Done' : 'Pending',
      notes: '',
    }))

  await writeFile(
    path.join(OUT_DIR, 'prospects.json'),
    JSON.stringify(prospects, null, 2),
  )
  await writeFile(
    path.join(OUT_DIR, 'sales.json'),
    JSON.stringify(salesTeam, null, 2),
  )
  await writeFile(
    path.join(OUT_DIR, 'templates.json'),
    JSON.stringify(messageTemplates, null, 2),
  )
  await writeFile(
    path.join(OUT_DIR, 'audits.json'),
    JSON.stringify(audits, null, 2),
  )
  await writeFile(
    path.join(OUT_DIR, 'communications.json'),
    JSON.stringify(communications, null, 2),
  )
  await writeFile(
    path.join(OUT_DIR, 'followups.json'),
    JSON.stringify(followUps, null, 2),
  )

  console.log(
    `Wrote ${prospects.length} prospects, ${salesTeam.length} sales, ${messageTemplates.length} templates, ${audits.length} audits, ${communications.length} communications, ${followUps.length} follow-ups.`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
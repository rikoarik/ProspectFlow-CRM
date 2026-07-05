import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const seedDir = path.join(root, 'src/lib/seed')
const outDir = path.join(root, 'supabase')
await mkdir(outDir, { recursive: true })

const prospects = JSON.parse(await readFile(path.join(seedDir, 'prospects.json'), 'utf8'))
const sales = JSON.parse(await readFile(path.join(seedDir, 'sales.json'), 'utf8'))
const templates = JSON.parse(await readFile(path.join(seedDir, 'templates.json'), 'utf8'))
const audits = JSON.parse(await readFile(path.join(seedDir, 'audits.json'), 'utf8'))
const comms = JSON.parse(await readFile(path.join(seedDir, 'communications.json'), 'utf8'))
const followups = JSON.parse(await readFile(path.join(seedDir, 'followups.json'), 'utf8'))

function lit(v) {
  if (v === null || v === undefined || v === '') return 'null'
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  return `'${String(v).replaceAll("'", "''")}'`
}

function insert(table, cols, rows) {
  if (!rows.length) return ''
  return `insert into ${table} (${cols.join(', ')}) values\n${rows
    .map((r) => `  (${cols.map((c) => lit(r[c])).join(', ')})`)
    .join(',\n')}\non conflict (id) do nothing;\n`
}

const chunks = []
chunks.push('-- ProspectFlow CRM seed data generated from pt_prospect_expanded_verified_contacts_2026.xlsx\n')
chunks.push(insert('profiles', ['id','full_name','email','role'], sales))
chunks.push(insert('prospects', ['id','company_name','industry','city','website','email','phone','contact_person','source','priority','active_confidence','active_evidence','website_audit_signal','offer_angle','assigned_to','status','first_channel','last_contacted_at','next_follow_up_at','notes','created_at','updated_at'], prospects))
chunks.push(insert('message_templates', ['id','title','channel','category','content'], templates))
chunks.push(insert('audits', ['id','prospect_id','problem_summary','mobile_issue','cta_issue','performance_issue','trust_issue','copywriting_issue','recommendation','audit_status','audit_file_url','mockup_url'], audits))
chunks.push(insert('communications', ['id','prospect_id','sales_id','channel','direction','message_summary','response_summary','status_after','created_at'], comms))
chunks.push(insert('follow_ups', ['id','prospect_id','sales_id','follow_up_date','reason','status','notes'], followups))
await writeFile(path.join(outDir, 'seed.sql'), chunks.join('\n'))
console.log(`Wrote supabase/seed.sql with ${prospects.length} prospects`)

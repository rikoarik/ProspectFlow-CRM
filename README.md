# ProspectFlow CRM

Modern CMS/CRM sales management app untuk mengelola prospek PT/perusahaan dari hasil riset, tracking sudah dichat atau belum, follow-up, audit website, template outreach, dan pipeline deal.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS + shadcn-style components
- TanStack Table
- Recharts
- Framer Motion-ready styling
- Supabase schema + seed SQL
- Local seed fallback dari `pt_prospect_expanded_verified_contacts_2026.xlsx`

## Fitur MVP

- Dashboard KPI: total prospek, contacted, replied, deal, conversion rate, priority A, follow-up
- Prospect table: search, filter status/priority/sales, sort, bulk update status, CSV import preview, export CSV
- Prospect detail: company info, audit signal, timeline komunikasi, follow-up, deal info
- Chat tracking: Mark as Contacted, Add Reply, Mark Interested, Mark Deal, Mark Rejected, Schedule Follow Up
- Message templates: dynamic variables, preview, copy message, open WhatsApp
- Kanban pipeline: drag prospect antar status
- Follow-up calendar/list: overdue, today, week, complete/reschedule
- Audit management list
- Sales team overview
- Supabase schema and seed data

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Tanpa env Supabase, app otomatis memakai seed lokal dari Excel. Data demo reset saat server restart.

## Supabase setup

1. Buat project Supabase.
2. Jalankan `supabase/schema.sql` di SQL editor.
3. Jalankan `supabase/seed.sql` untuk mengisi 115 prospek dari workbook.
4. Copy `.env.example` ke `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

5. Restart dev server.

> Catatan: RLS policy di schema dibuat demo-friendly (`using true`) agar MVP mudah dicoba. Untuk production, hubungkan `profiles.id` ke `auth.users.id` dan batasi role Sales hanya ke `assigned_to = auth.uid()`.

## Import CSV format

Header yang didukung:

```csv
company_name,industry,city,website,email,phone,source,priority,active_confidence,active_evidence,website_audit_signal,offer_angle,status,notes
```

Validasi import:

- `company_name` wajib
- `email` harus format valid jika diisi
- `website` harus URL valid jika diisi
- `priority` harus A/B/C
- `active_confidence` menerima High/Medium/Low atau A/B/C

## Seed conversion

Jika workbook berubah:

```bash
npm run convert-seed
node scripts/generate-supabase-seed.mjs
```

Workbook source: `pt_prospect_expanded_verified_contacts_2026.xlsx`, sheet `Combined Database`.

## Scripts

```bash
npm run dev        # run local app
npm run build      # production build
npm run lint       # lint
npm run typecheck  # TypeScript check
npm run convert-seed
```

## Project structure

```text
src/app                 App Router pages
src/components          UI and feature components
src/lib/data            query layer + analytics + local store
src/lib/seed            generated JSON seed from Excel
src/lib/supabase        Supabase client helper
supabase/schema.sql     database schema
supabase/seed.sql       seed data from Excel
scripts                 seed conversion scripts
```

## Next production improvements

- Connect Supabase Auth real users
- Harden RLS for Admin vs Sales visibility
- Add Supabase Storage upload for audit/proposal/mockup attachments
- Persist client mutations with server actions/API routes
- Add tests for CSV parser and data queries
- Add dark mode toggle

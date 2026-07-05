# ProspectFlow CRM Todo

## Completed
- [x] Inspect workbook and seed data from `Combined Database` sheet
- [x] Scaffold Next.js App Router + TypeScript + Tailwind project
- [x] Generate JSON seed data from Excel workbook
- [x] Build shadcn-style UI primitives
- [x] Build SaaS sidebar/topbar layout with mobile navigation
- [x] Build dashboard KPI cards and charts
- [x] Build prospect table with search/filter/sort/bulk update/import/export
- [x] Build prospect detail page with info, audit, communication timeline, follow-up, deal info
- [x] Build server-backed mutation API routes for demo persistence
- [x] Build kanban pipeline with drag/drop across all statuses
- [x] Build follow-up page with overdue/today/week/done buckets and complete/reschedule actions
- [x] Build audit management, message templates, sales team, settings pages
- [x] Write Supabase schema and seed SQL
- [x] Write README installation and Supabase setup docs
- [x] Apply code review fixes for persistence, schema alignment, null safety, CSV round-trip, WhatsApp normalization, mobile nav, and workflow visibility
- [x] Verify typecheck, lint, production build, route smoke tests, and API mutation persistence

## Review / Verification Results
- `npm run typecheck` passed.
- `npm run lint` passed with no warnings/errors.
- `npm run build` passed on Next.js 14.2.35.
- Runtime smoke tested dev server on port 3001:
  - `/`, `/prospects`, `/pipeline`, `/follow-up`, `/audit`, `/templates`, `/sales-team`, `/settings`, `/prospects/prospect-1` returned 200.
  - `/prospects/does-not-exist` returned expected 404.
  - API status mutation persisted into server-rendered detail page.
  - API communication log persisted into timeline.
  - API follow-up scheduling updated prospect detail/status.

## Remaining Production Hardening
- Connect real Supabase Auth users to `profiles.id`.
- Replace demo-open RLS policies with Admin/Sales scoped policies.
- Add Supabase Storage upload flow for audit/proposal/mockup files.
- Add automated tests for CSV parser, WhatsApp normalization, and API routes.
- Replace native drag/drop with dnd-kit for stronger touch/keyboard support if needed.

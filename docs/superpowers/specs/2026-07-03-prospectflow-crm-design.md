# ProspectFlow CRM — Design Spec

Date: 2026-07-03
Status: Approved for implementation (user requested "langsung coding", spec intentionally minimal)

## Goal
A Next.js sales CRM/CMS to manage Indonesian PT prospects sourced from
`pt_prospect_expanded_verified_contacts_2026.xlsx`. Tracks contact status,
follow-up, communication notes, message templates, pipeline, and light audit.

## Tech stack
- Next.js App Router + TypeScript + Tailwind CSS
- shadcn/ui (Radix + Tailwind) for components
- TanStack Table for prospect table
- Recharts for dashboard charts
- Framer Motion for small UI motion
- Supabase (Postgres + Auth + Storage) — schema + seed provided, app falls back
  to seeded local data when env vars are absent so demo runs out of the box
- XLSX parsing for seed conversion + CSV import preview (papaparse for CSV)

## Scope (MVP per user priority)
1. Dashboard with KPI cards + simple charts
2. Prospect table (search, filter, sort, bulk status)
3. Prospect detail (info, audit, timeline, follow-up, deal info)
4. Communication tracking buttons
5. Follow-up management
6. Message templates with dynamic variables and copy / open-WhatsApp URL
7. Kanban pipeline (drag-and-drop via dnd-kit)
8. Lightweight audit management
9. CSV import with column mapping + preview
10. Supabase SQL schema + seed + README

Out of MVP scope (placeholder UI only): real Supabase Storage upload runtime,
real OAuth provider setup, RLS row-level enforcement beyond role policy,
multi-tenant.

## Data model (matches user spec)
Tables: `profiles`, `prospects`, `communications`, `follow_ups`, `audits`,
`message_templates`, `attachments`.

Status enum: New, Need Review, Ready to Contact, Contacted, Replied,
Interested, Need Follow Up, Proposal Sent, Deal, Rejected, No Response,
Archived.

Priority: A | B | C. Active confidence: High | Medium | Low.
Channel: WhatsApp | Email | Phone | LinkedIn. Direction: Outbound | Inbound.

## Seed strategy
Convert Excel sheet `Combined Database` (115 rows) into a JSON seed file under
`src/lib/seed/prospects.json` plus a SQL insert (`supabase/seed.sql`) so the
app shows real data on first run. Provide mock sales profiles for assignment.

## Architecture
- `src/app/...` App Router pages
- `src/components/ui/...` shadcn-style primitives (manually authored, no CLI)
- `src/components/...` feature components
- `src/lib/supabase/...` client + server helpers + data access functions
- `src/lib/seed/...` local seed data + loaders
- `src/lib/types.ts` shared types and enums
- `src/lib/utils.ts` helpers (csv parse, template interpolation, wa link)
- `scripts/convert-seed.mjs` converts the Excel workbook to JSON seed (run once)

## Data flow
- Pages call typed `getProspects()` etc. in `src/lib/supabase/queries.ts`
- Each query function checks for Supabase env; if missing, returns local seed
- Mutations (status update, add communication, etc.) write through Supabase
  when configured; otherwise mutate in-memory store keyed by Next.js dev cache
  (acceptable for demo; documented in README)

## UI direction
- Sidebar + topbar layout, slate/white neutrals, emerald accent
- Cards for KPI, table for prospects, kanban columns for pipeline
- Empty states for no prospects / no follow-up / no templates
- Toast notifications for success/error via shadcn-style toast

## Testing & verification
- `pnpm install` (or `npm install`)
- `pnpm lint`, `pnpm typecheck`, `pnpm build`
- `pnpm dev`, then manually verify: dashboard loads, prospects render,
  detail page opens, copy template works, CSV import preview, kanban drag,
  follow-up list
- Document run in `docs/superpowers/plans/2026-07-03-prospectflow-crm-plan.md`
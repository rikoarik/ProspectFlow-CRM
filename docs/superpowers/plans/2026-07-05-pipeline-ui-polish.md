# Pipeline UI Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the `/pipeline` page so the kanban feels more modern and CRM-grade while preserving existing data flow, status semantics, and drag/drop behavior.

**Architecture:** Keep the current server/client split: the server page loads prospects and sales, while a thin client wrapper owns transient filter state. The kanban board continues to own optimistic mutation state, and derives visible cards from its local prospects plus `view`, `query`, and `priority` filters.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, lucide-react, existing internal primitives (`Card`, `KpiCard`, `Input`, `Select`, `useToast`, `apiRequest`).

## Global Constraints

- Domain status enum `PROSPECT_STATUSES` is locked — do not add, remove, or rename values.
- Native HTML5 drag-and-drop in `src/components/pipeline/kanban-board.tsx` stays in place. Do not add dnd-kit or another DnD library.
- Mutation API `POST /api/prospects/status` stays untouched. Preserve optimistic update + rollback + toast behavior.
- `Prospect` does not yet expose a numeric `value` field — `pipelineMetrics.totalValue` returns `0`, and the KPI renders `—` until the domain grows a value field in a future iteration.
- App copy remains Indonesian where the current page already uses Indonesian (`Drag prospek antar status`, `Belum ada prospek`, etc.).
- Use the existing visual language only: slate / emerald / amber / rose / violet palette, rounded `xl`/`2xl` geometry, and existing `Card` / `KpiCard` primitives.
- No automated test framework is configured in this repo. Verification for this work is `npm run typecheck`, `npm run lint`, `npm run build`, and manual smoke testing.
- This workspace is not currently a git repository in this session. If `git status` fails, skip commit commands and treat each task boundary as the review checkpoint.

---

## File Map

- `src/lib/types.ts` — add `PipelineView`, `PIPELINE_VIEW_STATUSES`, and parsing/filter helpers.
- `src/lib/data/analytics.ts` — add `PipelineMetrics` and `pipelineMetrics(prospects)`.
- `src/components/pipeline/pipeline-kpi-strip.tsx` — new server component that renders four `KpiCard`s.
- `src/components/pipeline/pipeline-view-tabs.tsx` — new client pill-tab control bound to `?view=`.
- `src/components/pipeline/pipeline-filters.tsx` — new controlled client toolbar for search + priority.
- `src/components/pipeline/pipeline-filters-client.tsx` — new thin client wrapper that owns filter state and passes it to the toolbar + kanban.
- `src/components/pipeline/kanban-board.tsx` — existing DnD board; extend it to consume `view`, `query`, and `priority`, and polish column/card visuals.
- `src/app/pipeline/page.tsx` — server page that loads data, computes metrics, parses `searchParams.view`, and renders the new composition.

---

### Task 1: Add `PipelineView` types and helpers

**Files:**
- Modify: `src/lib/types.ts`

**Interfaces:**
- Consumes: existing `PIPELINE_STATUSES`, `ProspectStatus`.
- Produces:
  - `type PipelineView = 'semua' | 'aktif' | 'followup' | 'arsip'`
  - `const PIPELINE_VIEW_STATUSES: Record<PipelineView, ProspectStatus[]>`
  - `parsePipelineView(value: string | undefined | null): PipelineView`
  - `filterStatusesByView<T extends ProspectStatus>(statuses: readonly T[], view: PipelineView): T[]`

- [ ] **Step 1: Add `PipelineView` and helper exports**

Insert the following block in `src/lib/types.ts` after `PIPELINE_STATUSES`:

```ts
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
```

- [ ] **Step 2: Typecheck the new exports**

Run: `npm run typecheck`
Expected: no TypeScript errors.

- [ ] **Step 3: Commit or checkpoint**

```bash
git add src/lib/types.ts
git commit -m "feat(pipeline): add PipelineView helpers"
```

If `git status` fails because the workspace is not a repo, skip the commit and record a review checkpoint instead.

---

### Task 2: Add `pipelineMetrics(prospects)` to analytics

**Files:**
- Modify: `src/lib/data/analytics.ts`

**Interfaces:**
- Consumes: `Prospect`, `ProspectStatus` from `@/lib/types`.
- Produces:
  - `interface PipelineMetrics { total: number; totalValue: number; topStage: ProspectStatus | null; staleCount: number }`
  - `pipelineMetrics(prospects: Prospect[], now?: Date): PipelineMetrics`

- [ ] **Step 1: Add `PipelineMetrics` and `pipelineMetrics()`**

Append this code near the bottom of `src/lib/data/analytics.ts`:

```ts
export interface PipelineMetrics {
  total: number
  totalValue: number
  topStage: ProspectStatus | null
  staleCount: number
}

export function pipelineMetrics(prospects: Prospect[], now: Date = new Date()): PipelineMetrics {
  const total = prospects.length
  const totalValue = 0

  const counts = new Map<ProspectStatus, number>()
  for (const prospect of prospects) {
    counts.set(prospect.status, (counts.get(prospect.status) ?? 0) + 1)
  }

  let topStage: ProspectStatus | null = null
  let topCount = -1
  for (const [status, count] of counts) {
    if (status === 'Archived') continue
    if (count > topCount) {
      topCount = count
      topStage = status
    }
  }

  const staleCount = prospects.filter((prospect) => {
    if (!prospect.next_follow_up_at) return false
    return new Date(prospect.next_follow_up_at) < now
  }).length

  return { total, totalValue, topStage, staleCount }
}
```

- [ ] **Step 2: Verify typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: both commands complete successfully.

- [ ] **Step 3: Commit or checkpoint**

```bash
git add src/lib/data/analytics.ts
git commit -m "feat(pipeline): add pipeline metrics helper"
```

If `git status` fails, skip the commit and note the task boundary as the checkpoint.

---

### Task 3: Create the KPI strip component

**Files:**
- Create: `src/components/pipeline/pipeline-kpi-strip.tsx`

**Interfaces:**
- Consumes: `PipelineMetrics` from `@/lib/data/analytics`, `KpiCard` from `@/components/dashboard/kpi-card`.
- Produces: `PipelineKpiStrip({ metrics }: { metrics: PipelineMetrics })`.

- [ ] **Step 1: Create `pipeline-kpi-strip.tsx`**

```tsx
import { CalendarClock, CheckCircle2, Target, TrendingUp } from 'lucide-react'
import { KpiCard } from '@/components/dashboard/kpi-card'
import type { PipelineMetrics } from '@/lib/data/analytics'

export function PipelineKpiStrip({ metrics }: { metrics: PipelineMetrics }) {
  const totalValueLabel = metrics.totalValue > 0 ? metrics.totalValue.toLocaleString('id-ID') : '—'
  const topStageLabel = metrics.topStage ?? '—'

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard title="Total prospek" value={metrics.total} helper="Semua status gabungan" icon={Target} tone="blue" />
      <KpiCard title="Total value" value={totalValueLabel} helper="Placeholder sampai domain punya nilai deal" icon={TrendingUp} tone="violet" />
      <KpiCard title="Stage teratas" value={topStageLabel} helper="Status dengan prospek terbanyak" icon={CheckCircle2} tone="emerald" />
      <KpiCard title="Stale follow up" value={metrics.staleCount} helper="Lewat tanggal hari ini" icon={CalendarClock} tone="rose" />
    </div>
  )
}
```

- [ ] **Step 2: Verify typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: both commands succeed.

- [ ] **Step 3: Commit or checkpoint**

```bash
git add src/components/pipeline/pipeline-kpi-strip.tsx
git commit -m "feat(pipeline): add KPI strip"
```

If the repo is unavailable, skip the commit and keep the task boundary as the checkpoint.

---

### Task 4: Create URL-driven view tabs

**Files:**
- Create: `src/components/pipeline/pipeline-view-tabs.tsx`

**Interfaces:**
- Consumes: `PipelineView` from `@/lib/types`, `usePathname`, `useSearchParams`, `cn`.
- Produces: `PipelineViewTabs({ current }: { current: PipelineView })`, a row of four pill links that toggle `?view=` without a full page reload.

- [ ] **Step 1: Create `pipeline-view-tabs.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { PipelineView } from '@/lib/types'

const ITEMS: { id: PipelineView; label: string }[] = [
  { id: 'semua', label: 'Semua' },
  { id: 'aktif', label: 'Aktif' },
  { id: 'followup', label: 'Follow up' },
  { id: 'arsip', label: 'Arsip' },
]

export function PipelineViewTabs({ current }: { current: PipelineView }) {
  const pathname = usePathname()
  const params = useSearchParams()
  const baseParams = new URLSearchParams(params?.toString() ?? '')

  return (
    <div className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
      {ITEMS.map((item) => {
        const next = new URLSearchParams(baseParams)
        if (item.id === 'semua') next.delete('view')
        else next.set('view', item.id)
        const qs = next.toString()
        const href = qs ? `${pathname}?${qs}` : pathname
        const active = item.id === current

        return (
          <Link
            key={item.id}
            href={href}
            replace
            scroll={false}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              active ? 'bg-slate-950 text-white shadow' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Verify typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: success on both commands.

- [ ] **Step 3: Commit or checkpoint**

```bash
git add src/components/pipeline/pipeline-view-tabs.tsx
git commit -m "feat(pipeline): add view tabs"
```

If the repo is unavailable, skip the commit and keep the task boundary as the checkpoint.

---

### Task 5: Create a controlled filter toolbar

**Files:**
- Create: `src/components/pipeline/pipeline-filters.tsx`

**Interfaces:**
- Consumes: `Priority` from `@/lib/types`, `Input`, `Select`, and lucide `Search`.
- Produces:
  - `PipelineFilters({ query, priority, total, shown, onQueryChange, onPriorityChange })`
  - no mutation logic, only controlled inputs and count display.

- [ ] **Step 1: Create `pipeline-filters.tsx`**

```tsx
'use client'

import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import type { Priority } from '@/lib/types'

export function PipelineFilters({
  query,
  priority,
  total,
  shown,
  onQueryChange,
  onPriorityChange,
}: {
  query: string
  priority: 'all' | Priority
  total: number
  shown: number
  onQueryChange: (query: string) => void
  onPriorityChange: (priority: 'all' | Priority) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="relative min-w-[220px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Cari company atau city..."
          className="pl-9"
          aria-label="Cari prospek"
        />
      </div>
      <div className="w-44">
        <Select
          value={priority}
          onChange={(e) => onPriorityChange(e.target.value as 'all' | Priority)}
          aria-label="Filter priority"
        >
          <option value="all">Semua priority</option>
          <option value="A">Priority A</option>
          <option value="B">Priority B</option>
          <option value="C">Priority C</option>
        </Select>
      </div>
      <div className="ml-auto text-sm text-slate-500">Menampilkan {shown} / {total}</div>
    </div>
  )
}
```

- [ ] **Step 2: Verify typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit or checkpoint**

```bash
git add src/components/pipeline/pipeline-filters.tsx
git commit -m "feat(pipeline): add controlled filter toolbar"
```

If the repo is unavailable, skip the commit and keep the task boundary as the checkpoint.

---

### Task 6: Refactor `KanbanBoard` to consume `view`, `query`, and `priority`

The board must keep optimistic mutation state locally. To preserve that behavior, filter the local `prospects` state instead of passing a pre-filtered list from the parent.

**Files:**
- Modify: `src/components/pipeline/kanban-board.tsx`

**Interfaces:**
- Consumes:
  - `PipelineView`, `Priority`, `Prospect`, `ProspectStatus`, `Sales`, `PIPELINE_STATUSES`, `filterStatusesByView` from `@/lib/types`
  - `apiRequest`, `useToast`, `formatDate`
- Produces:
  - `KanbanBoard({ initialProspects, sales, view, query, priority })`
  - same `move(id, status)` optimistic mutation flow as before.

- [ ] **Step 1: Replace the file contents**

Rewrite `src/components/pipeline/kanban-board.tsx` to the following:

```tsx
'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Inbox, MapPin } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { PriorityBadge } from '@/components/status-badge'
import { useToast } from '@/components/ui/toast'
import { apiRequest } from '@/lib/api'
import {
  filterStatusesByView,
  PIPELINE_STATUSES,
  type PipelineView,
  type Priority,
  type Prospect,
  type ProspectStatus,
  type Sales,
} from '@/lib/types'
import { formatDate } from '@/lib/utils'

export function KanbanBoard({
  initialProspects,
  sales,
  view = 'semua',
  query = '',
  priority = 'all',
}: {
  initialProspects: Prospect[]
  sales: Sales[]
  view?: PipelineView
  query?: string
  priority?: 'all' | Priority
}) {
  const [prospects, setProspects] = React.useState(initialProspects)
  const [dragging, setDragging] = React.useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  React.useEffect(() => {
    setProspects(initialProspects)
  }, [initialProspects])

  const salesName = React.useMemo(() => new Map(sales.map((s) => [s.id, s.full_name])), [sales])
  const visibleStatuses = React.useMemo(() => filterStatusesByView(PIPELINE_STATUSES, view), [view])

  const sourceItems = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return prospects.filter((prospect) => {
      if (!visibleStatuses.includes(prospect.status)) return false
      if (priority !== 'all' && prospect.priority !== priority) return false
      if (!normalizedQuery) return true
      return prospect.company_name.toLowerCase().includes(normalizedQuery) || prospect.city.toLowerCase().includes(normalizedQuery)
    })
  }, [prospects, visibleStatuses, query, priority])

  async function move(id: string, status: ProspectStatus) {
    const prospect = prospects.find((p) => p.id === id)
    if (!prospect || prospect.status === status) return
    const previous = prospects
    setProspects((items) => items.map((p) => (p.id === id ? { ...p, status } : p)))
    try {
      await apiRequest<{ prospect: Prospect }>('/api/prospects/status', {
        method: 'POST',
        body: JSON.stringify({ id, status }),
      })
      router.refresh()
      toast({ title: 'Pipeline updated', description: `${prospect.company_name} dipindah ke ${status}.`, variant: 'success' })
    } catch (error) {
      setProspects(previous)
      toast({
        title: 'Gagal memindahkan card',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'error',
      })
    }
  }

  return (
    <div className="overflow-x-auto pb-4 scrollbar-thin">
      <div
        className="grid min-w-[1680px] gap-4"
        style={{ gridTemplateColumns: `repeat(${visibleStatuses.length}, minmax(220px, 1fr))` }}
      >
        {visibleStatuses.map((status) => {
          const items = sourceItems.filter((p) => p.status === status)
          return (
            <section
              key={status}
              onDragOver={(e) => {
                e.preventDefault()
                e.currentTarget.dataset.hover = 'true'
              }}
              onDragLeave={(e) => {
                e.currentTarget.dataset.hover = 'false'
              }}
              onDrop={(e) => {
                e.preventDefault()
                e.currentTarget.dataset.hover = 'false'
                const id = e.dataTransfer.getData('text/plain') || dragging
                if (id) move(id, status)
                setDragging(null)
              }}
              className="rounded-2xl border border-slate-200 bg-white/80 p-3 transition-colors data-[hover=true]:bg-emerald-50 data-[hover=true]:ring-2 data-[hover=true]:ring-emerald-300"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-700">{status}</h2>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{items.length}</span>
              </div>
              <div className="space-y-3">
                {items.map((p) => (
                  <Card
                    key={p.id}
                    draggable
                    data-dragging={dragging === p.id ? 'true' : 'false'}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', p.id)
                      setDragging(p.id)
                    }}
                    onDragEnd={() => setDragging(null)}
                    className="cursor-grab bg-gradient-to-b from-white to-slate-50/40 p-3.5 transition-all hover:border-emerald-200 hover:shadow-md active:scale-[0.99] active:cursor-grabbing data-[dragging=true]:ring-2 data-[dragging=true]:ring-emerald-200"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/prospects/${p.id}`} className="font-semibold text-slate-950 hover:text-emerald-600">
                        {p.company_name}
                      </Link>
                      <MapPin className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-400" />
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{p.city || 'No city'}</div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <PriorityBadge priority={p.priority} />
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                        {salesName.get(p.assigned_to ?? '')?.split(' ')[0] ?? 'Unassigned'}
                      </span>
                    </div>
                    {p.next_follow_up_at ? (
                      <div className="mt-3 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-700">
                        Follow up {formatDate(p.next_follow_up_at)}
                      </div>
                    ) : null}
                  </Card>
                ))}
                {!items.length ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                    <Inbox className="mx-auto mb-2 h-5 w-5 text-slate-300" />
                    Belum ada prospek
                  </div>
                ) : null}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: both commands succeed.

- [ ] **Step 3: Commit or checkpoint**

```bash
git add src/components/pipeline/kanban-board.tsx
git commit -m "feat(pipeline): polish kanban board and add filters"
```

If the repo is unavailable, skip the commit and use the task boundary as the checkpoint.

---

### Task 7: Wire the page and client wrapper together

**Files:**
- Create: `src/components/pipeline/pipeline-filters-client.tsx`
- Modify: `src/app/pipeline/page.tsx`

**Interfaces:**
- Consumes:
  - `PipelineFilters` from Task 5
  - `KanbanBoard` from Task 6
  - `pipelineMetrics` from Task 2
  - `PipelineViewTabs` from Task 4
  - `parsePipelineView` from Task 1
- Produces:
  - `PipelineFiltersClient({ prospects, sales, view })`
  - updated `/pipeline` page composition with header, tabs, KPI strip, filters, and board.

- [ ] **Step 1: Create `pipeline-filters-client.tsx`**

```tsx
'use client'

import * as React from 'react'
import { PipelineFilters } from '@/components/pipeline/pipeline-filters'
import { KanbanBoard } from '@/components/pipeline/kanban-board'
import type { PipelineView, Priority, Prospect, Sales } from '@/lib/types'

export function PipelineFiltersClient({
  prospects,
  sales,
  view,
}: {
  prospects: Prospect[]
  sales: Sales[]
  view: PipelineView
}) {
  const [query, setQuery] = React.useState('')
  const [priority, setPriority] = React.useState<'all' | Priority>('all')

  const shown = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return prospects.filter((prospect) => {
      if (priority !== 'all' && prospect.priority !== priority) return false
      if (!normalizedQuery) return true
      return prospect.company_name.toLowerCase().includes(normalizedQuery) || prospect.city.toLowerCase().includes(normalizedQuery)
    }).length
  }, [prospects, query, priority])

  return (
    <div className="space-y-4">
      <PipelineFilters
        query={query}
        priority={priority}
        total={prospects.length}
        shown={shown}
        onQueryChange={setQuery}
        onPriorityChange={setPriority}
      />
      <KanbanBoard initialProspects={prospects} sales={sales} view={view} query={query} priority={priority} />
    </div>
  )
}
```

- [ ] **Step 2: Rewrite `src/app/pipeline/page.tsx`**

```tsx
import { PageHeader } from '@/components/page-header'
import { PipelineFiltersClient } from '@/components/pipeline/pipeline-filters-client'
import { PipelineKpiStrip } from '@/components/pipeline/pipeline-kpi-strip'
import { PipelineViewTabs } from '@/components/pipeline/pipeline-view-tabs'
import { pipelineMetrics } from '@/lib/data/analytics'
import { getProspects, getSales } from '@/lib/data/queries'
import { parsePipelineView } from '@/lib/types'

type SearchParams = { view?: string | string[] }

export default async function PipelinePage({ searchParams }: { searchParams: SearchParams }) {
  const viewParam = Array.isArray(searchParams.view) ? searchParams.view[0] : searchParams.view
  const view = parsePipelineView(viewParam)

  const [prospects, sales] = await Promise.all([getProspects(), getSales()])
  const metrics = pipelineMetrics(prospects)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Kanban pipeline"
        title="Drag prospek antar status"
        description="Pindahkan card dari New sampai Deal. Setiap perubahan status tersimpan di data layer demo/Supabase."
        actions={<PipelineViewTabs current={view} />}
      />
      <PipelineKpiStrip metrics={metrics} />
      <PipelineFiltersClient prospects={prospects} sales={sales} view={view} />
    </div>
  )
}
```

- [ ] **Step 3: Verify typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: both commands succeed.

- [ ] **Step 4: Commit or checkpoint**

```bash
git add src/components/pipeline/pipeline-filters-client.tsx src/app/pipeline/page.tsx
git commit -m "feat(pipeline): wire pipeline page composition"
```

If the repo is unavailable, skip the commit and keep the task boundary as the checkpoint.

---

### Task 8: End-to-end manual verification

**Files:** none modified unless a follow-up fix is required.

**Interfaces:**
- Consumes: finished UI from Tasks 1–7.
- Produces: confidence that `/pipeline` works with the new polish and does not regress other routes.

- [ ] **Step 1: Verify static checks**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: all three commands succeed.

- [ ] **Step 2: Start the app on port 3001**

Run in a separate terminal: `npx next dev -p 3001`
Expected: Next.js starts and logs the local URL.

- [ ] **Step 3: Verify route responses**

Run:

```bash
curl -sI http://localhost:3001/pipeline
curl -sI "http://localhost:3001/pipeline?view=aktif"
curl -sI "http://localhost:3001/pipeline?view=followup"
curl -sI "http://localhost:3001/pipeline?view=arsip"
curl -sI "http://localhost:3001/pipeline?view=bogus"
```

Expected: all responses are `HTTP/1.1 200 OK`. The `bogus` value falls back to `semua` via `parsePipelineView`.

- [ ] **Step 4: Verify the UI in the browser**

Open [src/app/pipeline/page.tsx](src/app/pipeline/page.tsx) through the running app at `/pipeline` and check:

- The KPI strip shows four cards.
- The view tabs appear in the page header, and `Semua` is active by default.
- Column headers show a dot, status name, and count.
- Search narrows visible cards by company name or city.
- Priority select narrows visible cards by priority.
- The helper text updates as `Menampilkan X / Y`.
- Dragging a card to another column triggers a success toast and the card appears in the new column.
- Refreshing the page keeps the new status.
- Switching to `Aktif` hides `Rejected`, `No Response`, and `Archived`.
- Switching to `Arsip` shows only `Deal`, `Rejected`, `No Response`, and `Archived`.

- [ ] **Step 5: Verify adjacent routes did not regress**

Run:

```bash
curl -sI http://localhost:3001/
curl -sI http://localhost:3001/prospects
curl -sI http://localhost:3001/follow-up
```

Expected: all responses are `HTTP/1.1 200 OK`.

- [ ] **Step 6: Commit any smoke-test fixes or record the final checkpoint**

If you changed code during verification:

```bash
git add -A
git commit -m "fix(pipeline): smoke verification follow-ups"
```

If the workspace is not a git repo, skip the commit and record that Tasks 1–8 completed successfully.

---

## Self-Review

1. **Spec coverage:**
   - KPI strip → Task 3.
   - View tabs → Task 4.
   - Filter toolbar → Task 5.
   - Kanban polish + drag/drop preservation → Task 6.
   - Page composition and client wrapper → Task 7.
   - End-to-end verification → Task 8.

2. **Placeholder scan:**
   - No `TODO` / `TBD` placeholders remain.
   - The `totalValue` KPI is intentionally specified to render `—` because the domain has no numeric value field yet.

3. **Type consistency:**
   - `PipelineView`, `PipelineMetrics`, `Priority`, and the `KanbanBoard` prop names match across all tasks.
   - Filtering is based on local `prospects` state in the board, so optimistic updates remain visible after a drag.

# AI research enrichment for prospects

## Problem

ProspectFlow CRM already has an AI feature for mockup generation, but it does not yet have a structured way to enrich an existing prospect with internet research.

The user wants a new sidebar menu that lets sales users pick an existing prospect, gather information from the prospect's official website plus public web/news search, and turn that into a usable sales brief with citations.

The feature should fit the current architecture:
- Next.js App Router pages and API routes
- Supabase-backed data access through `src/lib/data/queries.ts`
- OpenAI-compatible provider access through `src/lib/ai/client.ts`
- In-memory background jobs and client polling, as already used by AI Mockups

## Approved approach

Build a dedicated **AI Research** area under `/research` that focuses on **enriching existing prospects**.

V1 decisions:
- **Primary use case:** enrich an existing prospect, not find brand-new leads
- **Internet sources:** official website + public web/news search
- **LinkedIn/social:** explicitly out of scope for V1; design for phase 2 only
- **Entry point:** new sidebar menu, not inline-only
- **Output:** AI-generated sales brief with citations
- **Persistence:** save every run with history in a new `prospect_research` table, while keeping runtime jobs in the existing in-memory queue pattern
- **Search engine strategy:** use the AI provider's native web-search capability through an adapter when available; otherwise degrade to website-only with an explicit warning

## Goals

1. Let a sales user open `/research`, choose a prospect, and run a background research job.
2. Combine:
   - the prospect record already stored in CRM,
   - content fetched from the prospect's official website,
   - public web/news search results,
   into one structured sales brief.
3. Persist each research run with timestamp, citations, warning/fallback metadata, and optional analyst notes.
4. Reuse the current mockup patterns where they are already good enough: sidebar entry, background queue, polling UX, guarded route handlers, and Supabase-backed persistence.

## Non-goals

- No scraping that requires login, bypasses access controls, or depends on brittle anti-bot workarounds.
- No LinkedIn or social-media enrichment in V1.
- No bulk enrichment from the prospects table in V1.
- No lead-generation workflow for finding entirely new companies or contacts.
- No automatic overwrite of `prospects` fields from AI output in V1.
- No DB-backed job queue, SSE push, or cancel button in V1.

## User experience

### Sidebar

Add a new top-level navigation item in `src/components/app-shell.tsx`:
- `href: '/research'`
- `label: 'AI Research'`
- `icon: BookOpenText` or `Globe`

Placement should be next to the existing AI features, immediately after `AI Mockups`.

### `/research` index page

Create `src/app/research/page.tsx` as the index page for prospect enrichment.

The page should mirror the current shape of `src/app/mockups/page.tsx`:
- `PageHeader` with eyebrow `AI RESEARCH`
- short description explaining website + public search enrichment
- 3 small stat cards:
  - total prospects
  - prospects with at least one research run
  - prospects without research yet
- searchable card/list view of prospects
- each prospect card shows:
  - company name
  - industry and city
  - current status/priority
  - latest research timestamp if available
  - CTA to open the research studio

### `/research/[prospectId]` studio page

Create `src/app/research/[prospectId]/page.tsx` as the per-prospect research workspace.

The page should:
- load the prospect details
- load the latest research run plus prior history
- render a client component `ResearchStudio`

### Research studio

Create `src/components/research/research-studio.tsx` as the main client-side experience.

The component should follow the same interaction model as `src/components/mockups/mockup-studio.tsx`:
- `Generate` / `Regenerate` action starts a background job
- UI shows `queued → running → done / failed`
- client polls every 4 seconds
- status messages explain that the work is happening server-side
- completion automatically refreshes the visible result

The studio layout should be two-column on desktop:

**Left panel — Sales brief**
- generated company summary
- website takeaways
- recent public signals/news highlights
- recommended outreach angles
- copy button
- optional analyst notes field + save action for human notes only

**Right panel — Sources**
- official website source entry
- web/news search result list
- each entry shows title, URL, snippet, and source type badge (`Website`, `Search`, `News`)
- open-in-new-tab links

Below or beside the brief, show tabs or sections for:
- `Latest brief`
- `History`
- `Sources`

### UX simplifications for V1

- The generated brief itself is read-only after generation; users can add **analyst notes**, but do not directly edit AI output.
- Every run is persisted automatically when it completes; there is no separate “save the generated result” step.
- If provider search is unavailable, the user still gets a result based on website content only, but the UI must show a warning that web/news search was skipped.

## Data model

### New table: `prospect_research`

Add a new migration under `supabase/migrations/` to create a normalized history table.

```sql
create table if not exists prospect_research (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references prospects(id) on delete cascade,
  status text not null check (status in ('queued', 'running', 'done', 'failed')),
  summary jsonb not null default '{}'::jsonb,
  brief_text text not null default '',
  sources jsonb not null default '[]'::jsonb,
  analyst_notes text,
  fallback boolean not null default false,
  warning text,
  model text,
  prompt_version text not null default 'v1',
  artifact_path text,
  artifact_url text,
  created_by uuid references profiles(id),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Add indexes:
- `(prospect_id, created_at desc)` for history views
- `(status, created_at desc)` for admin/debug usage

### Stored payload shape

`summary jsonb` should hold the structured output used by the UI:

```json
{
  "company_profile": {
    "headline": "...",
    "industry_guess": "...",
    "website_summary": "..."
  },
  "signals": [
    { "title": "...", "detail": "...", "confidence": "high" }
  ],
  "outreach_angles": [
    { "angle": "...", "why": "..." }
  ],
  "red_flags": [
    "..."
  ]
}
```

`sources jsonb` should hold normalized citations:

```json
[
  {
    "source_type": "website",
    "title": "About Us",
    "url": "https://example.com/about",
    "snippet": "...",
    "fetched_at": "2026-07-05T12:00:00Z"
  },
  {
    "source_type": "news",
    "title": "Company launches ...",
    "url": "https://news.example/...",
    "snippet": "...",
    "fetched_at": "2026-07-05T12:00:05Z"
  }
]
```

### Why a new table instead of reusing `prospects` or `audits`

This data should not be flattened into `prospects` because:
- it is multi-run, not single-value
- it has citations and provenance
- it mixes generated brief text with structured source metadata
- it should be reviewable over time

It should not be merged into `audits` because research and website audit are adjacent workflows, not the same artifact.

## Storage design

V1 reuses the existing storage bucket accessor (`mockupsBucket()` in `src/lib/env.ts`) rather than introducing a second bucket.

### New folder convention

Store one artifact per completed research run under:

`research/prospect/{prospectId}/{researchId}.json`

The artifact is a JSON snapshot containing the same `summary`, `sources`, `warning`, `fallback`, `model`, and timestamps stored in Postgres.

### Required storage migration changes

The existing `mockups` bucket policy only allows:
- MIME types `text/html`, `text/plain`
- insert paths whose first folder segment is `prospect`

To support research artifacts, add a migration that:
1. extends allowed MIME types to include `application/json`
2. updates the insert policy so folder prefix may be either `prospect` or `research`

This keeps V1 on the same bucket while still separating storage paths cleanly.

## Background jobs

### Queue strategy

Reuse the architecture already introduced by `src/lib/ai/jobs.ts`, but generalize it so the queue can process different job kinds.

Recommended shape:

```ts
type JobKind = 'mockup' | 'research'
```

The queue state stays singleton + in-memory:
- same `queued/running/done/failed` lifecycle
- same pruning strategy
- same polling pattern from the client
- still single-worker in V1

### Research job contract

Add a `ResearchJob` variant with:
- `id`
- `kind: 'research'`
- `prospectId`
- `researchId` (DB row id)
- `status`
- `startedAt`
- `finishedAt`
- `result`
- `error`
- `errorCode`

### Enqueue flow

`POST /api/research/generate` should:
1. guard auth with `guardMutation()`
2. validate the prospect exists and is in scope
3. create a `prospect_research` row in `queued` state
4. enqueue the research job
5. return `{ job_id, research_id, status: 'queued', poll_url }`

### Worker flow

The worker should:
1. mark the DB row `running`
2. fetch the prospect data
3. fetch website content if `prospect.website` exists
4. run provider-native web/news search through the adapter
5. summarize the combined inputs into structured JSON + human-readable sales brief
6. upload the JSON artifact to storage
7. update the DB row to `done` or `failed`
8. update the in-memory job result used by the polling endpoint

### Persistence vs runtime state

Runtime progress remains driven by the in-memory queue for responsiveness.

The DB row is the durable run history. Unlike the current mockup job flow, research needs durable history, so the worker should update both:
- the in-memory queue entry for polling
- the `prospect_research` row for persistence

### Stale job cleanup

Because runtime jobs are still in memory, a server restart can orphan `queued` or `running` rows.

On every enqueue, run a cheap cleanup query:
- rows still in `queued` or `running`
- `created_at` or `started_at` older than a threshold (e.g. 2 hours)
- mark them `failed`
- set a warning like `server restarted before job finished`

This keeps the history table truthful without introducing a DB-backed queue.

## Research pipeline

### 1. Website fetch

Add `src/lib/research/fetch.ts`.

Responsibilities:
- fetch the prospect website with a short timeout
- follow only safe redirects
- strip scripts/styles/navigation noise where practical
- cap captured content size
- return a normalized `WebsiteSource` object

Rules:
- official website only in V1
- no login
- no headless-browser crawling in V1
- if fetch fails, continue with search-only context instead of failing the whole job

### 2. Web/news search adapter

Add `src/lib/research/search.ts`.

Expose a provider-neutral interface:

```ts
interface SearchHit {
  source_type: 'search' | 'news'
  title: string
  url: string
  snippet: string
}

async function searchWebNews(input: {
  companyName: string
  website?: string
  industry?: string
  city?: string
}): Promise<{ hits: SearchHit[]; warning: string | null }>
```

### Adapter design requirements

The codebase currently talks to an **OpenAI-compatible chat endpoint** through `src/lib/ai/client.ts`.
That does **not** guarantee search support at the current `OPENAI_BASE_URL` and `OPENAI_MODEL`.

Because of that, V1 must not hard-wire research to one provider-specific request shape.

Instead:
- keep `chatCompletion()` focused on ordinary text generation
- build a **research-specific search adapter** in `src/lib/research/search.ts`
- let the adapter own provider-specific API details, including calling a provider-specific search-capable endpoint if one exists
- treat search support as capability-gated rather than implied by `OPENAI_BASE_URL` compatibility
- return normalized `SearchHit[]` to the rest of the app
- if the current backend only exposes plain chat completions, return a warning and skip public search rather than trying to fake search through the base chat endpoint

### Initial V1 behavior

V1 supports two runtime modes:

1. **Provider search available**
   - use the AI provider's native web-search capability
   - normalize returned hits into `SearchHit[]`

2. **Provider search unavailable**
   - skip web/news search
   - continue with website-only enrichment
   - set a warning visible in the UI and persisted in `prospect_research.warning`

This preserves the approved product shape while keeping implementation robust across different OpenAI-compatible backends.

### Configuration

Do not add a separate third-party search provider in V1.

Add only minimal research configuration if needed:
- optional `OPENAI_RESEARCH_MODEL` override (fallback to `OPENAI_MODEL`)
- optional `AI_RESEARCH_SEARCH_MODE=provider|disabled`

No Serper, SerpAPI, Tavily, or similar provider is added in V1.

### 3. Prompt building and summarization

Add:
- `src/lib/research/prompt.ts`
- `src/lib/research/summarize.ts`

Responsibilities:
- build a clear system prompt for sales enrichment
- feed structured prospect context + normalized sources into the model
- request JSON-shaped output first, then derive `brief_text`
- validate and sanitize the result

The prompt should instruct the model to produce:
- a concise company profile
- actionable current signals
- 2–4 outreach angles
- confidence-aware red flags
- no invented facts beyond the provided sources
- no LinkedIn/social assumptions in V1

### Fallback strategy

If AI summarization fails, create a minimal fallback result instead of leaving the user empty-handed.

Fallback should include:
- prospect company name
- whether website fetch worked
- the source list that was gathered
- a short note that AI summarization failed

This matches the spirit of the existing mockup scaffold fallback: always return something usable.

## API surface

### `POST /api/research/generate`

New file: `src/app/api/research/generate/route.ts`

Responsibilities:
- auth guard
- validate input
- create DB row
- enqueue job
- return queue metadata

Response shape:

```json
{
  "job_id": "job_...",
  "research_id": "uuid",
  "status": "queued",
  "poll_url": "/api/research/status/job_..."
}
```

### `GET /api/research/status/[jobId]`

New file: `src/app/api/research/status/[jobId]/route.ts`

Responsibilities:
- auth guard
- read in-memory job state
- return `unknown` if server restarted or job was pruned

Response shape mirrors the mockup status endpoint:

```json
{
  "id": "job_...",
  "status": "queued | running | done | failed | unknown",
  "started_at": 0,
  "finished_at": 0,
  "result": { ... } | null,
  "error": "..." | null,
  "error_code": "..." | null
}
```

### `POST /api/research`

New file: `src/app/api/research/route.ts`

Purpose:
- persist analyst notes only
- not used to save the generated AI artifact itself

Payload:
- `research_id`
- `analyst_notes`

This preserves the integrity of generated history while still allowing human follow-up notes.

## Data access layer

Extend `src/lib/data/queries.ts` with:
- `createResearchRun(...)`
- `updateResearchRunStatus(...)`
- `saveResearchResult(...)`
- `saveResearchNotes(...)`
- `getResearchByProspect(prospectId)`
- `getLatestResearchByProspect(prospectId)`
- `getResearchRun(researchId)`
- `markStaleResearchRunsFailed(...)`

Also extend `src/lib/types.ts` with:
- `ResearchSource`
- `ResearchSummary`
- `ResearchRun`

## Prospect page integration

V1 entry point is the new `/research` menu, but the design should leave room for a later inline launch from the prospect detail page.

For V1, do **not** add prospect-detail UI yet.
That keeps scope aligned with the approved entry point and avoids mixing this feature into an already dense page.

## Authorization and RLS

Add RLS policies for `prospect_research` that mirror prospect ownership rules:
- admins can read/write all rows
- sales users can read/write rows tied to prospects they are allowed to access
- row ownership is derived from the related `prospects` row, not from free-form user input

All writes still go through guarded server routes.

## File and module layout

### New files

- `src/app/research/page.tsx`
- `src/app/research/[prospectId]/page.tsx`
- `src/app/api/research/route.ts`
- `src/app/api/research/generate/route.ts`
- `src/app/api/research/status/[jobId]/route.ts`
- `src/components/research/research-studio.tsx`
- `src/lib/research/fetch.ts`
- `src/lib/research/search.ts`
- `src/lib/research/prompt.ts`
- `src/lib/research/summarize.ts`
- `supabase/migrations/2026-07-05_prospect_research.sql`
- `supabase/migrations/2026-07-05_research_storage_rules.sql`

### Existing files to modify

- `src/components/app-shell.tsx` — add sidebar item
- `src/lib/ai/jobs.ts` — generalize queue for job kind `research`
- `src/lib/data/queries.ts` — research queries
- `src/lib/types.ts` — research types
- `src/lib/env.ts` — optional research-search env accessors if needed
- `src/lib/mockups/storage.ts` or equivalent storage helper area — add reusable upload helper for research artifacts if the current mockup helper is too HTML-specific

## Error handling

### Provider search unavailable

Do not hard-fail the whole request.
Instead:
- continue with website-only enrichment
- persist `warning`
- show a visible UI banner explaining that public search/news was skipped

### Missing website

Do not block enrichment.
The system can still run search/news-only enrichment.

### Website fetch timeout or 4xx/5xx

Persist a warning and continue with search results.

### Search returns nothing useful

Generate a brief based on the best available inputs:
- CRM prospect data
- website content if fetch succeeded
- any normalized sources that were gathered

Explicitly say that no meaningful public search results were found.

### No website and no useful search results

Still create a lightweight fallback brief from CRM prospect data alone.
The user should get a persisted result with a clear warning rather than an empty screen or missing history entry.

### AI provider error

Create a fallback summary result, persist it, and return `done` with `fallback: true` if the fallback artifact is usable.
Use `failed` only when nothing user-facing can be produced.

### Server restart during job

Status endpoint returns `unknown`; the client shows a friendly retry message. The stale DB-row cleanup described above keeps persisted history from remaining permanently queued.

## Testing and verification

### Unit-level verification

- `fetch.ts` correctly strips oversized/noisy website responses
- `search.ts` normalizes provider output into `SearchHit[]`
- `summarize.ts` validates AI output and generates fallback shape when invalid
- warning formatting is user-readable and localized consistently with the existing app copy style

### Integration verification

1. Prospect with valid website and provider search enabled
   - enqueue succeeds quickly
   - polling reaches `done`
   - brief and sources render
   - DB row and storage artifact are created

2. Prospect with no website
   - search-only path still produces a brief

3. Prospect with dead website
   - warning shown
   - search results still appear if available

4. Provider search unavailable
   - website-only result completes
   - warning persists in history

5. Missing AI key
   - fallback result appears
   - no blank screen

6. Dev-server restart during running job
   - polling reaches `unknown`
   - user can re-run cleanly

### Project-level verification

- `npm run lint`
- `npm run typecheck`
- manual route render checks for `/research` and `/research/[prospectId]`
- existing `/mockups` flow still works unchanged

## Design decisions worth preserving

1. **Dedicated route, not inline-only**
   - keeps the feature discoverable
   - matches the existing AI Mockups product shape

2. **Provider search behind an adapter**
   - the current codebase uses an OpenAI-compatible endpoint, not a guaranteed search API
   - the design must survive provider differences without contaminating the rest of the app

3. **Durable run history + in-memory runtime queue**
   - preserves the simplicity of the current background-job implementation
   - adds the persistence the research workflow actually needs

4. **Read-only generated brief + editable analyst notes**
   - keeps provenance intact
   - still gives sales users a place to record human judgment

5. **Shared storage bucket with a new folder prefix**
   - minimal operational overhead for V1
   - requires only a targeted migration rather than a whole second storage system

## Future extensions (not V1)

- LinkedIn/social enrichment from public pages only
- bulk research from the prospects table
- write-back suggestions for `industry`, `city`, and contact metadata
- contact discovery and multi-contact storage
- inline `Run research` action on the prospect detail page
- DB-backed or external job queue if this feature outgrows the current in-memory worker
- richer artifact capture (HTML snapshots, screenshots, PDFs)

## Files

- New: `src/app/research/page.tsx`
- New: `src/app/research/[prospectId]/page.tsx`
- New: `src/app/api/research/route.ts`
- New: `src/app/api/research/generate/route.ts`
- New: `src/app/api/research/status/[jobId]/route.ts`
- New: `src/components/research/research-studio.tsx`
- New: `src/lib/research/fetch.ts`
- New: `src/lib/research/search.ts`
- New: `src/lib/research/prompt.ts`
- New: `src/lib/research/summarize.ts`
- Modify: `src/components/app-shell.tsx`
- Modify: `src/lib/ai/jobs.ts`
- Modify: `src/lib/data/queries.ts`
- Modify: `src/lib/types.ts`
- Modify: `src/lib/env.ts` (only if minimal research-search env helpers are needed)
- New: `supabase/migrations/2026-07-05_prospect_research.sql`
- New: `supabase/migrations/2026-07-05_research_storage_rules.sql`

## Verification checklist

- `/research` route lists prospects and latest-research state
- `/research/[prospectId]` can enqueue and poll a research job
- `prospect_research` history persists with sources and warnings
- storage artifact is written under `research/prospect/...`
- provider-search-unavailable path still produces a website-only result
- mockup generation flow remains intact after queue generalization
- lint and typecheck pass

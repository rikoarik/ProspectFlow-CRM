# AI background job (no client timeout)

## Problem

The current `/api/mockups/generate` endpoint is synchronous. If the AI provider takes longer than 90 seconds (or the hosting platform's `maxDuration`), the request is cut off and the user falls back to a scaffold. The user wants the AI generation to keep running server-side without a hard cap so they can move on or wait.

## Approved approach

Convert AI mockup generation to a background job that the client polls. No hard client-side timeout.

- `POST /api/mockups/generate` enqueues a job and returns a `job_id` immediately (no `maxDuration` cap needed because the request no longer waits on the AI call).
- An in-memory worker picks up jobs and calls `chatCompletion` without the 90-second internal timeout (or with a much higher one).
- `GET /api/mockups/status/[jobId]` returns the current state of a job, and on `done`/`failed` includes the same payload the synchronous endpoint used to return.
- `MockupStudio` polls the status endpoint every 4 seconds until the job is `done` or `failed`, then updates the UI.

## Backend

### `src/lib/ai/jobs.ts` (new)

- `JobState`: `'queued' | 'running' | 'done' | 'failed'`.
- `Job`:
  ```ts
  interface Job {
    id: string
    prospectId: string
    auditId: string | null
    brief: string | null
    status: JobState
    startedAt: number | null
    finishedAt: number | null
    result?: GeneratePayload
    error?: string
  }
  ```
- Singleton `Map<string, Job>` keyed by job id.
- `enqueueGenerateJob({ prospectId, auditId, brief })` creates the job, kicks off the worker, returns the job id.
- Worker: sequential async loop that processes the next queued job, calls `chatCompletion`, on success sanitizes HTML and uploads to storage, on failure records an error and marks the job `failed`. The worker also builds a fallback scaffold and uploads it when the AI call fails so the user always gets something usable.
- Cleanup: jobs older than 1 hour are pruned on each new enqueue (cheap safety net).

### `src/lib/ai/client.ts`

- Remove the 90-second `setTimeout` abort. Leave a very high cap (or none) so truly slow generations can complete.
- Keep `AiError` codes (`network`, `rate_limit`, `bad_response`, `missing_key`, `unsupported`).
- Caller can still pass an `AbortSignal` for cancellation.

### `src/app/api/mockups/generate/route.ts`

- Remove `maxDuration = 120` (or keep it small, since this endpoint only enqueues).
- After validating the prospect, call `enqueueGenerateJob` and return `{ job_id, status: 'queued' }`.
- Keep `guardMutation` for auth.

### `src/app/api/mockups/status/[jobId]/route.ts` (new)

- `GET` only.
- Look up the job in the in-memory map.
- If found, return `{ id, status, started_at, finished_at, result?, error? }`. `result` carries the same shape the old synchronous response did (`html`, `url`, `path`, `fallback`, `warning`, `audit_id`, `model`).
- If not found (e.g. process restarted), return `{ id, status: 'unknown' }`.

## Frontend

### `src/components/mockups/mockup-studio.tsx`

- After clicking Regenerate:
  1. POST `/api/mockups/generate` and receive `{ job_id, status }`.
  2. Set `generating = true` and start polling `GET /api/mockups/status/[job_id]` every 4 seconds.
  3. While polling, the existing `GenerateProgress` card shows stages; a subtle "AI berjalan di server…" message replaces the step labels once `status === 'running'`.
  4. On `done`, stop polling, apply `result` to the same state variables as before (`html`, `url`, `fallback`, `auditId`, `warning`), and run the success toast.
  5. On `failed`, apply whatever `result` (likely the fallback scaffold) plus the warning, and run the fallback toast.
  6. On `unknown`, build a fallback scaffold locally (server scaffold helper is not callable from the client; render a friendly warning and let the user click Regenerate again).
- Polling is cleaned up on unmount and when status becomes terminal.

## Non-goals

- No persistent DB-backed job queue (overkill for the current single-user demo and would require migrations).
- No cancel button.
- No parallel workers.
- No webhook / SSE push from server to client; polling is fine for 4-second intervals.
- No streaming tokens; the user still sees the full HTML when the job completes.

## Files

- New: `src/lib/ai/jobs.ts`
- New: `src/app/api/mockups/status/[jobId]/route.ts`
- Modify: `src/lib/ai/client.ts`
- Modify: `src/app/api/mockups/generate/route.ts`
- Modify: `src/components/mockups/mockup-studio.tsx`

## Verification

- `tsc --noEmit` passes.
- `POST /api/mockups/generate` returns `{ job_id, status: 'queued' }` quickly (no AI call waits on the request).
- Polling the status endpoint eventually returns `done` with the expected `html` / `url` / `audit_id`.
- When the AI is not configured, the worker still produces a fallback scaffold and marks the job `done` with `fallback: true`.
- Restarting the dev server while a job is running returns `unknown` on subsequent polls and the UI degrades gracefully.
- All previously passing top-level routes still render.
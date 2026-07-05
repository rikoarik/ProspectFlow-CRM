# AI timeout and loading UX

## Problem

AI mockup generation currently aborts after 30 seconds and surfaces a raw warning such as:

> `network: Permintaan ke AI provider timeout setelah 30 detik.`

The backend does return a fallback scaffold, but the UI only shows a small button spinner while waiting, so the user cannot tell whether the AI is working, stuck, or failed.

## Approved approach

Use the lightweight approach: keep generation as a synchronous request, raise the AI provider timeout to 90 seconds, and add an explicit progress-step loading experience in `MockupStudio`.

## Backend changes

- In `src/lib/ai/client.ts`, change AI provider timeout from 30 seconds to 90 seconds.
- Update timeout copy to explain that the provider did not finish within 90 seconds and the user can retry or simplify the brief.
- In `src/app/api/mockups/generate/route.ts`, keep the current synchronous flow and fallback scaffold behavior.
- Raise route `maxDuration` from 60 to 120 seconds so the route can outlive the 90-second provider timeout plus storage/audit work.
- Keep `fallback: true` and `warning` in the JSON payload when AI fails or times out.

## Frontend changes

In `src/components/mockups/mockup-studio.tsx`:

- When `generating` is true, show a large progress card in the preview pane.
- Progress steps:
  1. Menyiapkan brief
  2. Menghubungi AI provider
  3. Menunggu respons AI
  4. Membersihkan HTML
  5. Menyimpan preview
- Show an elapsed timer while generating.
- Explain that generation usually takes 30–90 seconds.
- Make the HTML textarea read-only during generation so users do not edit stale HTML while a request is in-flight.
- Keep the existing Regenerate button visible as the retry path.
- If the backend returns a fallback warning, show friendly copy that the AI was slow/unavailable and ProspectFlow made a fallback template.

## Non-goals

- No streaming token UI.
- No background job or polling.
- No cancel button.
- No automatic retries that could double-charge AI tokens.

## Verification

- TypeScript check passes.
- `/mockups/[prospectId]` renders.
- Clicking Regenerate shows progress steps and elapsed timer.
- A timeout/failure returns fallback HTML plus a friendly warning, not a raw network-looking error.
- A normal success still updates `html`, `url`, `fallback`, `audit_id`, and preview.

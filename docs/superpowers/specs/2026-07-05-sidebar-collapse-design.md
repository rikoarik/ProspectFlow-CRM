# Sidebar collapse + nav perf

## Problem

- The fixed left sidebar (`w-72`, 288px) is always open on desktop. There is no way to reclaim that space when you want a wider canvas.
- Navigating between top-level pages (Dashboard, Prospects, Pipeline, etc.) feels slow on dev / first-load because the only `<Link>`s in the sidebar do not prefetch by default and the brand header section has no transition.

## Goals

- Add a collapse toggle to the desktop sidebar so the user can switch between the wide (`w-72`) and collapsed (`w-16`) layouts.
- Persist the collapsed state in `localStorage` so the next visit stays in the same mode.
- Make navigations feel snappier by enabling `prefetch` on sidebar links (Next.js App Router prefetches RSC payload on hover/in-view).
- Keep the mobile experience unchanged (off-canvas drawer already covers <`lg`).

## Design

### Sidebar (`src/components/app-shell.tsx`)

- New local state `collapsed` (default `false`) initialized from `localStorage` key `prospectflow.sidebar.collapsed`.
- On toggle, update state and write `localStorage`.
- Width:
  - Expanded: `w-72` (unchanged).
  - Collapsed: `w-16` plus an icon-only `NavLinks` variant that hides labels and tooltips on hover (title attribute + group-hover).
- A collapse/expand icon button in the bottom section of the sidebar.
- The brand area collapses to icon only when collapsed; the bottom "War-room mode" card hides when collapsed (avoids vertical overflow).
- The `main` area's left padding (`lg:pl-72`) switches to `lg:pl-16` when collapsed.

### Nav perf

- Use `<Link prefetch>` on the desktop sidebar links. Next.js will prefetch the segment on hover / viewport intersection.
- Cache the previous `pathname` so a click while already on the page does not trigger a no-op navigation; minor optimization.
- No need to change route handlers or data fetching — perf gains come from prefetching RSC and from React skipping the layout re-render when path does not change.

## Non-goals

- No animation library added. Use Tailwind `transition-all` for sidebar width change.
- No persistent collapse on the mobile drawer (mobile UX unchanged).
- No server-rendered collapse preference (localStorage only).

## Files

Modify:
- `src/components/app-shell.tsx`

No new files. No backend changes.

## Verification

- TypeScript check passes.
- `/dashboard`, `/prospects`, `/pipeline` each render with the sidebar in its default expanded mode.
- Toggling the collapse button shrinks the sidebar to `w-16` and shows icon-only links; clicking again expands it back.
- Reload preserves the previous collapse choice.
- Hovering a sidebar link prefetches the next route (verified via `_next/data` request or the dev tools Network tab).
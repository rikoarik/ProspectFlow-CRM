# Pipeline UI Polish — Design Spec

Date: 2026-07-05
Status: Approved (Pendekatan A)
Scope: Visual polish untuk `/pipeline` agar terasa lebih modern CRM-grade.

## Goal
Membuat halaman `/pipeline` ProspectFlow CRM lebih bersih, hierarki informasi lebih jelas,
dan siap untuk pengguna sales tanpa menambah kompleksitas data. Hasil yang diharapkan:

- 12 status pipeline tetap ditampilkan lengkap (kontrak domain tidak berubah).
- Ringkasan metrik utama pipeline tampil sekilas di atas board.
- View pill tabs membantu fokus pada subset kolom tanpa menghapus data.
- Drag-and-drop behavior, mutation API, dan data flow tidak berubah.

## Non-Goals
- Tidak menambah atau mengubah status pipeline (tidak menyentuh `PROSPECT_STATUSES` /
  `PIPELINE_STATUSES`).
- Tidak mengganti native HTML5 DnD dengan library lain.
- Tidak menambah kolom baru, urusan deal value, atau dark mode.
- Tidak menyentuh endpoint API atau data layer (`setProspectStatus`, dll.).
- Tidak melakukan overhaul layout mobile (board tetap horizontal dengan `min-w-[1680px]`).

## Approach (Pendekatan A — direkomendasikan)
1. Tambahkan `pipeline-kpi-strip` di atas board untuk ringkasan cepat.
2. Tambahkan `pipeline-view-tabs` di area `PageHeader` (menggunakan `searchParams`).
3. Tambahkan `pipeline-filters` sebagai toolbar mini (search + priority) di bawah KPI.
4. Polish `kanban-board` (header kolom, card, empty state) mengikuti gaya
   `KpiCard`/dashboard dan primitives aplikasi.

## Components

### 1. `src/components/pipeline/pipeline-kpi-strip.tsx` (baru)
- Komponen server (tidak ada state). Menerima props `metrics: PipelineMetrics`.
- Layout: `grid gap-4 sm:grid-cols-2 xl:grid-cols-4`.
- 4 `KpiCard` dari `@/components/dashboard/kpi-card`:
  - Total prospek (Target/blue).
  - Total value (format ringkas; TrendingUp/violet) — placeholder Rp 0 bila tidak ada.
  - Stage konversi tertinggi (CheckCircle2/emerald) — dihitung dari highest non-archived status count.
  - Stale (CalendarClock/rose) — prospek dengan `next_follow_up_at` < hari ini.

### 2. `src/components/pipeline/pipeline-view-tabs.tsx` (baru)
- Komponen client. Menerima `current: PipelineView`.
- Daftar view:
  - `semua` (default): tampilkan semua `PIPELINE_STATUSES`.
  - `aktif`: exclude `Rejected`, `No Response`, `Archived`.
  - `followup`: fokus `Contacted`, `Replied`, `Interested`, `Need Follow Up`, `Proposal Sent`.
  - `arsip`: fokus `Deal`, `Rejected`, `No Response`, `Archived`.
- Tampilan: pill horizontal dengan active state (slate-950 background + white text),
  inactive state (slate-50 background + slate-700 text).
- Navigasi: Next `Link` dengan `href="/pipeline?view=aktif"`, `replace` shallow client navigation
  via `usePathname`/`useSearchParams` (read-only). Tidak ada round-trip server.

### 3. `src/components/pipeline/pipeline-filters.tsx` (baru)
- Komponen client. State internal: `query`, `priority`.
- Implementasi:
  - `query`: input search dengan icon Search overlay (mengikuti pola `ProspectTable`).
  - `priority`: `Select` dari `@/components/ui/select` dengan opsi `All`, `A`, `B`, `C`.
  - Counter helper "Menampilkan X / Y" di kanan.
- Filter diterapkan client-side. Hasilnya mengirim `filtered` via callback ke parent.

### 4. `src/components/pipeline/kanban-board.tsx` (refactor)
Props baru:
- `view: PipelineView` (default `'semua'`).
- `filtered?: Prospect[]` (jika ada, dipakai sebagai sumber; kalau tidak, gunakan `initialProspects`).
- Tetap menerima `sales: Sales[]`.

Perubahan perilaku:
- Tentukan `visibleStatuses = filterByView(PIPELINE_STATUSES, view)`.
- Mapping tetap: `prospects.filter((p) => visibleStatuses.includes(p.status))`
  per kolom.
- Grid wrapper `min-w-[1680px] grid-cols-12` tetap; hanya kolom yang terlihat
  (`visibleStatuses.length`) yang dirender — tidak menambah gap kosong.

Perubahan visual:
- Section kolom:
  - `rounded-2xl border border-slate-200 bg-white/80 p-3`.
  - Header kolom: bar tipis 4px atas dengan warna status (mapping status→tone, tone baru).
  - Title: `text-xs font-semibold uppercase tracking-wide text-slate-700`.
  - Counter chip: `rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600`.
  - Drag-over state: `ring-2 ring-emerald-300 bg-emerald-50`.
- Card (pakai `Card` primitive):
  - `p-3.5`, `bg-gradient-to-b from-white to-slate-50/40`.
  - Baris 1: company link (font-semibold, hover emerald-600) + MapPin kecil di kanan.
  - Baris 2: priority chip (kiri) + sales pill (kanan).
  - Baris 3: follow-up amber card (jika ada `next_follow_up_at`).
  - Hover/active: `hover:border-emerald-200 hover:shadow-md active:scale-[0.99]`.
- Empty column state: gunakan pola `'rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400'`
  ditambah icon `Inbox` kecil di atas dengan `text-slate-300`.

Mutasi tetap:
- HTML5 drag/drop handler tidak berubah (`onDragStart`/`onDragOver`/`onDrop`).
- Optimistic update + rollback.
- `apiRequest('/api/prospects/status', ...)` + `router.refresh()` + `toast`.

### 5. `src/lib/data/analytics.ts` (perluasan)
Tambah helper baru:
- `pipelineMetrics(prospects: Prospect[]) => PipelineMetrics` mengembalikan:
  - `total: number`
  - `totalValue: number` (sum nilai numerik dari prospek; bila tidak ada numeric field,
    kembalikan `0` dan tampilkan "—" di KPI).
  - `topStage: ProspectStatus | null` (status dengan count tertinggi, selain `Archived`).
  - `staleCount: number` (count `next_follow_up_at` < today).

Catatan: `Prospect` belum punya kolom `value`. Untuk MVP, `totalValue = 0`
dan KPI menampilkan `—`. Placeholder ini akan diganti di iterasi berikutnya
bila kolom value ditambahkan di layer data.

### 6. `src/lib/types.ts` (tambahan, non-breaking)
Tambah konstanta dan union:
- `PipelineView = 'semua' | 'aktif' | 'followup' | 'arsip'`
- `PIPELINE_VIEW_STATUSES: Record<PipelineView, ProspectStatus[]>` (dipakai oleh board).

Tambah helper export:
- `filterByView(statuses, view) => statuses.filter((s) => PIPELINE_VIEW_STATUSES[view].includes(s))`

### 7. `src/app/pipeline/page.tsx` (perubahan)
- Menerima `searchParams: { view?: string }`.
- Tentukan `view = parseView(searchParams.view) ?? 'semua'`.
- Parallel await:
  - `getProspects()` (existing, role-scoped)
  - `getSales()` (existing)
  - `pipelineMetrics(prospects)` (server-only, no extra round-trip)
- Render urutan:
  - `PageHeader` dengan `actions={<PipelineViewTabs current={view} />}`.
  - `PipelineKpiStrip metrics={metrics}`.
  - `PipelineFilters` (client wrapper).
  - `KanbanBoard initialProspects={prospects} sales={sales} view={view} />`.

## Data Flow
1. Server: `PipelinePage` load prospects + sales + metrics.
2. PageHeader actions → `PipelineViewTabs` shallow update URL → server re-render
   (Next.js App Router otomatis re-render dengan `searchParams`).
3. `PipelineFilters` (client) → set state lokal → kirim `filtered` ke `KanbanBoard`.
4. Board render hanya kolom yang lolos `view` + `filtered`.
5. User drag card → `move(id, status)` (existing) → optimistic update di board →
   `apiRequest('/api/prospects/status')` → `router.refresh()` → `toast` → revalidate server.

## Error Handling
- View tab filter hanya menyembunyikan kolom visual; data server tetap utuh.
- Filter client-side `PipelineFilters` tidak mengubah data.
- Drag/drop error: rollback state lokal + toast error (tidak berubah).
- Metrics aman jika `prospects` kosong (KPI menampilkan `0`).

## Visual Mockup (ASCII ringkas)
```
┌──────────────────────────────────────────────────────────────────────────┐
│ Eyebrow: KANBAN PIPELINE                                                │
│ Title: Drag prospek antar status                                        │
│ [Semua] [Aktif] [Follow up] [Arsip]                      [+ Import CSV]  │
├──────────────────────────────────────────────────────────────────────────┤
│ ┌Total─┐ ┌Value──┐ ┌Top stage─┐ ┌Stale──┐                              │
│ │ 128  │ │   —   │ │ Replied  │ │ 7     │                              │
│ └──────┘ └───────┘ └──────────┘ └───────┘                              │
├──────────────────────────────────────────────────────────────────────────┤
│ 🔍 [cari company/city...]   Priority [All ▾]           Menampilkan 128 │
├──────────────────────────────────────────────────────────────────────────┤
│  ▌ New (12)   ▌ Replied (8)   ▌ Deal (4)   ...                          │
│  ┌────────┐  ┌────────┐  ┌────────┐                                     │
│  │ Card A │  │ Card B │  │ Card C │   … 12 columns                      │
│  └────────┘  └────────┘  └────────┘                                     │
└──────────────────────────────────────────────────────────────────────────┘
```

## Verification
- `npm run typecheck` lulus tanpa error baru.
- `npm run lint` lulus tanpa warning baru.
- `npm run build` lulus.
- Dev manual di `http://localhost:3000/pipeline`:
  - Board tampil dengan header kolom baru, KPI strip di atas, tab pills aktif di kanan atas.
  - Klik tab `Aktif` → URL menjadi `?view=aktif` dan kolom `Rejected`, `No Response`,
    `Archived` tersembunyi. State/data prospek tetap utuh.
  - Ketik di search box → card di setiap kolom tersaring (client-side).
  - Drag card antar kolom → status berubah di server, toast muncul, tidak ada error.
  - Refresh halaman setelah drag → status tetap (server persisted).
- Smoke test halaman lain (`/prospects`, `/follow-up`, `/dashboard`) tidak regresi.

## Files Touched
- New:
  - `src/components/pipeline/pipeline-kpi-strip.tsx`
  - `src/components/pipeline/pipeline-view-tabs.tsx`
  - `src/components/pipeline/pipeline-filters.tsx`
- Modified:
  - `src/app/pipeline/page.tsx`
  - `src/components/pipeline/kanban-board.tsx`
  - `src/lib/data/analytics.ts`
  - `src/lib/types.ts`

## Reuse
- `KpiCard` (`src/components/dashboard/kpi-card.tsx`)
- `Card` primitives (`src/components/ui/card.tsx`)
- `Select` (`src/components/ui/select.tsx`)
- `apiRequest` (`src/lib/api.ts`)
- `useToast` (`src/components/ui/toast.tsx`)
- `PIPELINE_STATUSES` + `ProspectStatus` (`src/lib/types.ts`)
- `statusColor`, `priorityColor` (`src/lib/design.ts`) — untuk tone visual opsional
  (header kolom tidak langsung mewarnai background, tetapi status pill tone mengikuti palette).

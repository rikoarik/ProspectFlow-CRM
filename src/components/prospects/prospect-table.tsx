'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Download, Eye, FileUp, Plus, Search } from 'lucide-react'
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty-state'
import { PriorityBadge, StatusBadge } from '@/components/status-badge'
import { useToast } from '@/components/ui/toast'
import { apiRequest } from '@/lib/api'
import { PROSPECT_STATUSES, type Priority, type Prospect, type ProspectStatus, type Sales } from '@/lib/types'
import { formatDate, safeUrl } from '@/lib/utils'
import { CsvImportDialog } from '@/components/prospects/csv-import-dialog'

const csvHeader = ['company_name','industry','city','website','email','phone','source','priority','active_confidence','active_evidence','website_audit_signal','offer_angle','status','notes']

export function ProspectTable({ initialProspects, sales }: { initialProspects: Prospect[]; sales: Sales[] }) {
  const [prospects, setProspects] = React.useState(initialProspects)
  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'priority', desc: false }])
  const [query, setQuery] = React.useState('')
  const [status, setStatus] = React.useState('all')
  const [priority, setPriority] = React.useState('all')
  const [assigned, setAssigned] = React.useState('all')
  const [selected, setSelected] = React.useState<Record<string, boolean>>({})
  const [bulkStatus, setBulkStatus] = React.useState<ProspectStatus>('Contacted')
  const [importOpen, setImportOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const salesName = React.useMemo(() => new Map(sales.map((s) => [s.id, s.full_name])), [sales])

  const filtered = React.useMemo(() => {
    const q = query.toLowerCase()
    return prospects.filter((p) => {
      const matchesQuery =
        !q ||
        [p.company_name, p.city, p.industry, p.email, p.phone].some((v) => (v ?? '').toLowerCase().includes(q))
      const matchesStatus = status === 'all' || p.status === status
      const matchesPriority = priority === 'all' || p.priority === priority
      const matchesAssigned = assigned === 'all' || p.assigned_to === assigned
      return matchesQuery && matchesStatus && matchesPriority && matchesAssigned
    })
  }, [prospects, query, status, priority, assigned])

  const columns = React.useMemo<ColumnDef<Prospect>[]>(
    () => [
      {
        id: 'select',
        header: () => (
          <input
            aria-label="Select all visible prospects"
            type="checkbox"
            checked={filtered.length > 0 && filtered.every((p) => selected[p.id])}
            onChange={(e) => {
              const checked = e.currentTarget.checked
              setSelected((current) => {
                const next = { ...current }
                filtered.forEach((p) => {
                  next[p.id] = checked
                })
                return next
              })
            }}
          />
        ),
        cell: ({ row }) => (
          <input
            aria-label={`Select ${row.original.company_name}`}
            type="checkbox"
            checked={!!selected[row.original.id]}
            onChange={(e) => setSelected((s) => ({ ...s, [row.original.id]: e.currentTarget.checked }))}
          />
        ),
      },
      {
        accessorKey: 'company_name',
        header: 'Company',
        cell: ({ row }) => (
          <div>
            <Link href={`/prospects/${row.original.id}`} className="font-semibold text-slate-950 hover:text-emerald-600">
              {row.original.company_name}
            </Link>
            <div className="text-xs text-slate-500">{row.original.industry}</div>
          </div>
        ),
      },
      { accessorKey: 'city', header: 'City / Area' },
      {
        accessorKey: 'website',
        header: 'Website',
        cell: ({ row }) => row.original.website ? <a href={safeUrl(row.original.website)} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">Open</a> : '—',
      },
      { accessorKey: 'email', header: 'Email' },
      { accessorKey: 'phone', header: 'Phone / WA' },
      {
        accessorKey: 'priority',
        header: 'Priority',
        cell: ({ row }) => <PriorityBadge priority={row.original.priority} />,
      },
      { accessorKey: 'active_confidence', header: 'Confidence' },
      {
        accessorKey: 'assigned_to',
        header: 'Assigned Sales',
        cell: ({ row }) => salesName.get(row.original.assigned_to ?? '') ?? 'Unassigned',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'last_contacted_at',
        header: 'Last Contacted',
        cell: ({ row }) => formatDate(row.original.last_contacted_at),
      },
      {
        accessorKey: 'next_follow_up_at',
        header: 'Next Follow Up',
        cell: ({ row }) => formatDate(row.original.next_follow_up_at),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Button asChild variant="outline" size="sm">
            <Link href={`/prospects/${row.original.id}`}><Eye className="h-3.5 w-3.5" /> Detail</Link>
          </Button>
        ),
      },
    ],
    [filtered, salesName, selected],
  )

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  async function handleBulkStatus() {
    const ids = Object.entries(selected).filter(([, v]) => v).map(([id]) => id)
    if (!ids.length) return toast({ title: 'Pilih prospek dulu', description: 'Centang prospek yang ingin di-update.', variant: 'error' })
    setLoading(true)
    try {
      const result = await apiRequest<{ prospects: Prospect[] }>('/api/prospects/bulk-status', {
        method: 'POST',
        body: JSON.stringify({ ids, status: bulkStatus }),
      })
      const map = new Map(result.prospects.map((p) => [p.id, p]))
      setProspects((items) => items.map((p) => map.get(p.id) ?? p))
      setSelected({})
      router.refresh()
      toast({ title: 'Status diperbarui', description: `${ids.length} prospek diubah ke ${bulkStatus}.`, variant: 'success' })
    } catch (error) {
      toast({ title: 'Bulk update gagal', description: error instanceof Error ? error.message : 'Unknown error', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  function exportCsv() {
    const rows = filtered.map((p) => [
      p.company_name,
      p.industry,
      p.city,
      p.website,
      p.email,
      p.phone,
      p.source,
      p.priority,
      p.active_confidence,
      p.active_evidence,
      p.website_audit_signal,
      p.offer_angle,
      p.status,
      p.notes,
    ])
    const csv = [csvHeader, ...rows].map((r) => r.map((v) => `"${String(v ?? '').replaceAll('"', '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'prospectflow-prospects.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <CsvImportDialog open={importOpen} onOpenChange={setImportOpen} onImported={(rows) => {
        setProspects((p) => [...p, ...rows])
        router.refresh()
      }} />
      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Prospect database</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4" /> Export CSV</Button>
              <Button variant="outline" onClick={() => setImportOpen(true)}><FileUp className="h-4 w-4" /> Import CSV</Button>
              <Button variant="accent" disabled title="Manual add form belum masuk MVP"><Plus className="h-4 w-4" /> Add Prospect</Button>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="relative xl:col-span-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input aria-label="Search prospects" placeholder="Search company, city, industry" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
            </div>
            <Select aria-label="Filter status" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All status</option>
              {PROSPECT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
            <Select aria-label="Filter priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="all">All priority</option>
              {(['A', 'B', 'C'] as Priority[]).map((p) => <option key={p} value={p}>Priority {p}</option>)}
            </Select>
            <Select aria-label="Filter assigned sales" value={assigned} onChange={(e) => setAssigned(e.target.value)}>
              <option value="all">All sales</option>
              {sales.filter((s) => s.role === 'Sales').map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-3">
            <span className="text-sm text-slate-500">Bulk update selected to</span>
            <Select aria-label="Bulk update status" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value as ProspectStatus)} className="w-56">
              {PROSPECT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
            <Button size="sm" onClick={handleBulkStatus} disabled={loading}>Apply</Button>
            <span className="text-xs text-slate-500">{Object.values(selected).filter(Boolean).length} selected</span>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <EmptyState icon={FileUp} title="Belum ada prospek" description="Import CSV prospek atau tambah manual untuk mulai tracking outreach." />
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((hg) => (
                    <TableRow key={hg.id}>
                      {hg.headers.map((header) => (
                        <TableHead key={header.id} onClick={header.column.getToggleSortingHandler()} className="cursor-pointer whitespace-nowrap">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? null}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="max-w-[260px] truncate whitespace-nowrap">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
'use client'

import * as React from 'react'
import { AlertTriangle, CheckCircle2, FileUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/toast'
import { apiRequest } from '@/lib/api'
import { parseProspectCsv, previewToProspectInput, type CsvPreviewRow } from '@/lib/csv'
import type { Prospect } from '@/lib/types'

export function CsvImportDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onImported: (rows: Prospect[]) => void
}) {
  const [rows, setRows] = React.useState<CsvPreviewRow[]>([])
  const [loading, setLoading] = React.useState(false)
  const { toast } = useToast()
  const validRows = rows.filter((r) => r.errors.length === 0)

  async function onFile(file?: File) {
    if (!file) return
    setLoading(true)
    try {
      const parsed = await parseProspectCsv(file)
      setRows(parsed)
      toast({ title: 'CSV parsed', description: `${parsed.length} baris siap direview.`, variant: 'success' })
    } catch {
      toast({ title: 'CSV gagal dibaca', description: 'Pastikan file memakai header kolom yang benar.', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function save() {
    if (!validRows.length) return
    setLoading(true)
    try {
      const result = await apiRequest<{ prospects: Prospect[] }>('/api/prospects/import', {
        method: 'POST',
        body: JSON.stringify({ rows: validRows.map(previewToProspectInput) }),
      })
      onImported(result.prospects)
      toast({ title: 'Prospek diimport', description: `${result.prospects.length} prospek ditambahkan.`, variant: 'success' })
      onOpenChange(false)
      setRows([])
    } catch (error) {
      toast({ title: 'Import gagal', description: error instanceof Error ? error.message : 'Unknown error', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(980px,calc(100vw-2rem))]">
        <DialogHeader>
          <DialogTitle>Import CSV prospect</DialogTitle>
          <DialogClose onClick={() => onOpenChange(false)} />
        </DialogHeader>
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <FileUp className="mx-auto h-8 w-8 text-emerald-600" />
          <label htmlFor="csv-file" className="mt-3 block font-semibold text-slate-950">Upload CSV dengan mapping kolom prospect</label>
          <p className="mt-1 text-sm text-slate-500">
            Header didukung: company_name, industry, city, website, email, phone, source, priority,
            active_confidence, active_evidence, website_audit_signal, offer_angle, status, notes.
          </p>
          <Input
            id="csv-file"
            type="file"
            accept=".csv,text/csv"
            className="mx-auto mt-4 max-w-md"
            disabled={loading}
            onChange={(e) => onFile(e.currentTarget.files?.[0])}
          />
        </div>

        {rows.length ? (
          <div className="mt-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm text-slate-600">
                {validRows.length}/{rows.length} baris valid
              </div>
              <Button variant="accent" onClick={save} disabled={!validRows.length || loading}>Save valid rows</Button>
            </div>
            <div className="max-h-80 overflow-auto rounded-xl border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Validation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 50).map((row) => (
                    <TableRow key={row.rowNumber}>
                      <TableCell>{row.rowNumber}</TableCell>
                      <TableCell className="font-medium">{row.company_name || '—'}</TableCell>
                      <TableCell>{row.city || '—'}</TableCell>
                      <TableCell>{row.priority}</TableCell>
                      <TableCell>{row.status}</TableCell>
                      <TableCell>
                        {row.errors.length ? (
                          <span className="inline-flex items-center gap-1 text-xs text-rose-600"><AlertTriangle className="h-3 w-3" /> {row.errors.join(', ')}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="h-3 w-3" /> Valid</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
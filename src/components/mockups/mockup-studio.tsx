'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Monitor, RefreshCw, Save, Smartphone, Sparkles, Tablet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { apiRequest } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { Prospect } from '@/lib/types'

interface MockupStudioProps {
  prospect: Prospect
  initialHtml?: string
  initialUrl?: string
  initialFallback?: boolean
  initialAuditId?: string | null
}

type Device = 'desktop' | 'tablet' | 'mobile'

interface GenerateResponse {
  html: string
  url: string
  fallback: boolean
  audit_id?: string | null
  warning?: string | null
}

export function MockupStudio({
  prospect,
  initialHtml = '',
  initialUrl = '',
  initialFallback = false,
  initialAuditId = null,
}: MockupStudioProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [html, setHtml] = React.useState(initialHtml)
  const [url, setUrl] = React.useState(initialUrl)
  const [fallback, setFallback] = React.useState(initialFallback)
  const [auditId, setAuditId] = React.useState<string | null>(initialAuditId)
  const [device, setDevice] = React.useState<Device>('desktop')
  const [generating, setGenerating] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [warning, setWarning] = React.useState<string | null>(null)

  const debouncedHtml = useDebounced(html, 250)

  async function handleGenerate(brief?: string) {
    setGenerating(true)
    setWarning(null)
    try {
      const response = await apiRequest<GenerateResponse>('/api/mockups/generate', {
        method: 'POST',
        body: JSON.stringify({ prospect_id: prospect.id, audit_id: auditId, brief }),
      })
      setHtml(response.html)
      setUrl(response.url)
      setFallback(Boolean(response.fallback))
      setAuditId(response.audit_id ?? null)
      if (response.warning) setWarning(response.warning)
      toast({
        title: response.fallback ? 'Mockup scaffold dibuat' : 'Mockup baru di-generate',
        description: response.fallback
          ? 'OPENAI_API_KEY belum diset — pakai template offline. Tambah key di .env.local untuk hasil dari AI.'
          : 'Preview diperbarui.',
        variant: response.fallback ? 'info' : 'success',
      })
      router.refresh()
    } catch (err) {
      toast({
        title: 'Gagal generate mockup',
        description: err instanceof Error ? err.message : 'Coba lagi sebentar.',
        variant: 'error',
      })
    } finally {
      setGenerating(false)
    }
  }

  async function handleSave() {
    if (!html.trim()) {
      toast({ title: 'Belum ada HTML untuk disimpan', variant: 'error' })
      return
    }
    setSaving(true)
    try {
      const response = await apiRequest<{ url: string; audit_id: string | null }>('/api/mockups', {
        method: 'POST',
        body: JSON.stringify({
          prospect_id: prospect.id,
          audit_id: auditId,
          html,
        }),
      })
      setUrl(response.url)
      setAuditId(response.audit_id ?? auditId)
      toast({
        title: 'Mockup tersimpan',
        description: response.url ? `Disimpan ke storage: ${response.url}` : 'Tersimpan di audit record.',
        variant: 'success',
      })
      router.refresh()
    } catch (err) {
      toast({
        title: 'Gagal menyimpan mockup',
        description: err instanceof Error ? err.message : 'Coba lagi.',
        variant: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(html)
      toast({ title: 'HTML disalin ke clipboard', variant: 'success' })
    } catch {
      toast({ title: 'Gagal menyalin HTML', variant: 'error' })
    }
  }

  const charEstimate = Math.max(1, Math.round(html.length / 4))
  const deviceSize =
    device === 'desktop'
      ? 'w-full'
      : device === 'tablet'
        ? 'mx-auto w-[760px] max-w-full'
        : 'mx-auto w-[390px] max-w-full'

  return (
    <div className="flex h-[78vh] min-h-[640px] flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
            AI Mockup Studio
          </div>
          <div className="text-sm font-medium text-slate-950">{prospect.company_name}</div>
          <div className="text-xs text-slate-500">
            {prospect.industry || '—'} · {prospect.city || '—'}
            {fallback ? ' · offline template' : url ? ' · tersimpan di storage' : ''}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-full border border-slate-200 bg-white p-0.5">
            <DeviceButton active={device === 'desktop'} onClick={() => setDevice('desktop')} label="Desktop">
              <Monitor className="h-3.5 w-3.5" />
            </DeviceButton>
            <DeviceButton active={device === 'tablet'} onClick={() => setDevice('tablet')} label="Tablet">
              <Tablet className="h-3.5 w-3.5" />
            </DeviceButton>
            <DeviceButton active={device === 'mobile'} onClick={() => setDevice('mobile')} label="Mobile">
              <Smartphone className="h-3.5 w-3.5" />
            </DeviceButton>
          </div>
          <Button variant="outline" onClick={() => handleGenerate()} disabled={generating}>
            <RefreshCw className={cn('h-4 w-4', generating && 'animate-spin')} />
            {generating ? 'Generating…' : 'Regenerate'}
          </Button>
          <Button variant="accent" onClick={handleSave} disabled={saving || !html.trim()}>
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      {warning ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          ⚠️ {warning}
        </div>
      ) : null}

      <div className="grid flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 text-xs text-slate-500">
            <span>HTML source</span>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
            >
              <Copy className="h-3 w-3" /> Copy
            </button>
          </div>
          <Textarea
            value={html}
            onChange={(event) => setHtml(event.target.value)}
            spellCheck={false}
            placeholder="Klik Regenerate untuk generate mockup. Hasil AI akan muncul di sini dan langsung ter-render di preview."
            className="h-full min-h-[480px] flex-1 resize-none rounded-none border-0 font-mono text-xs leading-relaxed focus-visible:ring-0"
          />
          <div className="flex items-center justify-between border-t border-slate-100 px-3 py-1.5 text-[11px] text-slate-500">
            <span>{html.length.toLocaleString('id-ID')} chars · ~{charEstimate.toLocaleString('id-ID')} tokens</span>
            <span>Sandbox: allow-same-origin only</span>
          </div>
        </div>

        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Live preview
            </span>
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-medium text-emerald-600 hover:underline"
              >
                Open public URL ↗
              </a>
            ) : null}
          </div>
          <div className="flex-1 overflow-auto bg-slate-100 p-3">
            <div className={cn('h-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm', deviceSize)}>
              {html ? (
                <iframe
                  key={device}
                  title="AI mockup preview"
                  sandbox="allow-same-origin"
                  srcDoc={debouncedHtml}
                  className="h-full w-full"
                />
              ) : (
                <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-2 p-6 text-center text-sm text-slate-500">
                  <Sparkles className="h-5 w-5 text-slate-400" />
                  Klik <strong className="font-semibold">Regenerate</strong> untuk membuat mockup.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DeviceButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-500 transition',
        active && 'bg-slate-950 text-white shadow-sm',
      )}
    >
      {children}
    </button>
  )
}

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(handle)
  }, [value, delay])
  return debounced
}
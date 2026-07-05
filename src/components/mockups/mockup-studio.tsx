'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Circle, Clock, Copy, Monitor, RefreshCw, Save, Smartphone, Sparkles, Tablet } from 'lucide-react'
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
type GenerateStage = 'idle' | 'queued' | 'running' | 'done' | 'error'

const GENERATE_STEPS: { key: GenerateStage; label: string; helper: string }[] = [
  { key: 'queued', label: 'Mengantri di server', helper: 'Job sudah masuk antrian, menunggu worker.' },
  { key: 'running', label: 'AI berjalan di server', helper: 'Tanpa batas waktu — kamu bisa tinggalkan tab dan kembali lagi nanti.' },
  { key: 'done', label: 'Selesai', helper: 'Hasil siap ditampilkan.' },
]

interface JobResultPayload {
  html: string
  url: string
  path: string | null
  fallback: boolean
  warning: string | null
  audit_id: string | null
  model: string | null
}

interface EnqueueResponse {
  job_id: string
  audit_id: string | null
  status: 'queued'
  poll_url: string
}

interface StatusResponse {
  id: string
  status: 'queued' | 'running' | 'done' | 'failed' | 'unknown'
  started_at: number | null
  finished_at: number | null
  result: JobResultPayload | null
  error: string | null
  error_code: string | null
}

const POLL_INTERVAL_MS = 4000

export function MockupStudio({
  prospect,
  initialHtml = '',
  initialUrl = '',
  initialFallback = false,
  initialAuditId = null,
}: MockupStudioProps) {
  const router = useRouter()
  const { toast } = useToast()
  const splitInitial = splitStyle(initialHtml)
  const [html, setHtml] = React.useState(splitInitial.html)
  const [css, setCss] = React.useState(splitInitial.css)
  const [activeTab, setActiveTab] = React.useState<'html' | 'css'>('html')
  const [url, setUrl] = React.useState(initialUrl)
  const [fallback, setFallback] = React.useState(initialFallback)
  const [auditId, setAuditId] = React.useState<string | null>(initialAuditId)
  const [device, setDevice] = React.useState<Device>('desktop')
  const [generating, setGenerating] = React.useState(false)
  const [generateStage, setGenerateStage] = React.useState<GenerateStage>('idle')
  const [generationStartedAt, setGenerationStartedAt] = React.useState<number | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [warning, setWarning] = React.useState<string | null>(null)

  const composedHtml = React.useMemo(() => insertStyle(html, css), [html, css])
  const debouncedHtml = useDebounced(composedHtml, 250)
  const elapsedMs = useElapsed(generationStartedAt, generating)
  const pollRef = React.useRef<ReturnType<typeof setInterval> | null>(null)
  const stopPolling = React.useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  React.useEffect(() => () => stopPolling(), [stopPolling])

  async function handleGenerate(brief?: string) {
    setGenerating(true)
    setGenerateStage('queued')
    setGenerationStartedAt(Date.now())
    setWarning(null)

    try {
      const enqueue = await apiRequest<EnqueueResponse>('/api/mockups/generate', {
        method: 'POST',
        body: JSON.stringify({ prospect_id: prospect.id, audit_id: auditId, brief }),
      })

      setAuditId(enqueue.audit_id ?? auditId)
      const statusUrl = `/api/mockups/status/${enqueue.job_id}`

      const finalize = (result: JobResultPayload) => {
        const split = splitStyle(result.html)
        setHtml(split.html)
        setCss(split.css)
        setUrl(result.url ?? '')
        setFallback(Boolean(result.fallback))
        setAuditId(result.audit_id ?? null)
        if (result.warning) setWarning(result.warning)
        toast({
          title: result.fallback ? 'Template fallback dibuat' : 'Mockup baru di-generate',
          description: result.fallback
            ? 'AI provider lambat atau gagal, jadi ProspectFlow membuat template awal agar kamu tetap bisa lanjut.'
            : 'Preview diperbarui.',
          variant: result.fallback ? 'info' : 'success',
        })
        router.refresh()
        setGenerateStage('done')
      }

      const fail = (message: string) => {
        toast({
          title: 'Gagal generate mockup',
          description: message,
          variant: 'error',
        })
        setGenerateStage('error')
      }

      stopPolling()
      pollRef.current = setInterval(async () => {
        const finishGenerating = () => {
          stopPolling()
          setGenerating(false)
          setGenerationStartedAt(null)
        }
        try {
          const status = await apiRequest<StatusResponse>(statusUrl, { method: 'GET' })
          if (status.status === 'queued') {
            setGenerateStage('queued')
          } else if (status.status === 'running') {
            setGenerateStage('running')
          } else if (status.status === 'done') {
            if (status.result) finalize(status.result)
            else fail('Job selesai tapi tidak ada hasil.')
            finishGenerating()
          } else if (status.status === 'failed') {
            if (status.result) {
              finalize(status.result)
              setWarning(status.error ?? 'AI job gagal.')
            } else {
              fail(status.error ?? 'AI job gagal.')
            }
            finishGenerating()
          } else if (status.status === 'unknown') {
            fail(status.error ?? 'Job tidak ditemukan — kemungkinan server di-restart.')
            finishGenerating()
          }
        } catch (err) {
          fail(err instanceof Error ? err.message : 'Polling job gagal.')
          finishGenerating()
        }
      }, POLL_INTERVAL_MS)
    } catch (err) {
      setGenerateStage('error')
      toast({
        title: 'Gagal enqueue mockup',
        description: err instanceof Error ? err.message : 'Coba lagi sebentar.',
        variant: 'error',
      })
      setGenerating(false)
      setGenerationStartedAt(null)
    }
  }

  async function handleSave() {
    if (!html.trim()) {
      toast({ title: 'Belum ada HTML untuk disimpan', variant: 'error' })
      return
    }
    setSaving(true)
    try {
      const finalHtml = insertStyle(html, css)
      const response = await apiRequest<{ url: string; audit_id: string | null }>('/api/mockups', {
        method: 'POST',
        body: JSON.stringify({
          prospect_id: prospect.id,
          audit_id: auditId,
          html: finalHtml,
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
      await navigator.clipboard.writeText(insertStyle(html, css))
      toast({ title: 'HTML disalin ke clipboard', variant: 'success' })
    } catch {
      toast({ title: 'Gagal menyalin HTML', variant: 'error' })
    }
  }

  const finalHtmlForCount = insertStyle(html, css)
  const charEstimate = Math.max(1, Math.round(finalHtmlForCount.length / 4))
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
          <Button variant="accent" onClick={handleSave} disabled={generating || saving || !html.trim()}>
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      {warning ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          ⚠️ {formatGenerateWarning(warning, fallback)}
        </div>
      ) : null}

      <div className="grid flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white min-h-0">
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
          <div className="flex flex-col gap-2 flex-1 min-h-0">
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('html')}
                  className={cn(
                    'px-3 py-1 rounded-t-md text-sm font-medium',
                    activeTab === 'html' ? 'bg-white border border-b-0' : 'bg-slate-50 text-slate-500',
                  )}
                >
                  HTML
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('css')}
                  className={cn(
                    'px-3 py-1 rounded-t-md text-sm font-medium',
                    activeTab === 'css' ? 'bg-white border border-b-0' : 'bg-slate-50 text-slate-500',
                  )}
                >
                  CSS
                </button>
              </div>
              <div className="text-xs text-slate-500">{activeTab === 'html' ? 'HTML (tanpa <style>)' : 'CSS (ekstrak)'}</div>
            </div>

            <div className="p-3 flex-1 min-h-0 overflow-hidden">
              {activeTab === 'css' ? (
                <Textarea
                  value={css}
                  onChange={(event) => setCss(event.target.value)}
                  readOnly={generating}
                  spellCheck={false}
                  placeholder={generating ? 'AI sedang merangkai CSS…' : 'CSS yang diekstrak dari dokumen akan muncul di sini. Edit bebas.'}
                  className="h-full min-h-0 w-full resize-none font-mono text-xs leading-relaxed focus-visible:ring-0"
                />
              ) : (
                <Textarea
                  value={html}
                  onChange={(event) => setHtml(event.target.value)}
                  readOnly={generating}
                  spellCheck={false}
                  placeholder={generating ? 'AI sedang merangkai HTML…' : 'Klik Regenerate untuk generate mockup. Hasil AI akan muncul di sini dan langsung ter-render di preview.'}
                  className="h-full min-h-0 flex-1 resize-none rounded-none border-0 font-mono text-xs leading-relaxed focus-visible:ring-0"
                />
              )}
            </div>
          </div>
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
              {generating ? (
                <GenerateProgress
                  stage={generateStage}
                  elapsedMs={elapsedMs}
                  hasExistingHtml={Boolean(html.trim())}
                />
              ) : html ? (
                <iframe
                  key={device}
                  title="AI mockup preview"
                  sandbox="allow-same-origin allow-scripts"
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

function splitStyle(input: string): { html: string; css: string } {
  const html = input ?? ''
  const regex = /<style\b[^>]*>([\s\S]*?)<\/style>/gi
  const parts: string[] = []
  let m: RegExpExecArray | null
  while ((m = regex.exec(html)) !== null) {
    if (m[1]) parts.push(m[1].trim())
  }
  if (parts.length > 0) {
    const css = parts.join('\n\n')
    // remove all style blocks
    const without = html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    return { html: without, css }
  }
  return { html, css: '' }
}

function insertStyle(html: string, css: string): string {
  if (!css || !css.trim()) return html
  const styleTag = `<style>${css}</style>`
  if (/<head\b/i.test(html)) {
    return html.replace(/<head\b([^>]*)>/i, `<head$1>${styleTag}`)
  }
  if (/<html\b/i.test(html)) {
    return html.replace(/<html\b([^>]*)>/i, `<html$1><head>${styleTag}</head>`)
  }
  if (/<!doctype html>/i.test(html)) {
    return html.replace(/<!(doctype|DOCTYPE)\s+html>/i, (m) => `${m}\n<head>${styleTag}</head>`)
  }
  return `<!DOCTYPE html><head>${styleTag}</head>${html}`
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

function useElapsed(startedAt: number | null, running: boolean): number {
  const [now, setNow] = React.useState(Date.now())
  React.useEffect(() => {
    if (!running || !startedAt) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [running, startedAt])
  if (!startedAt) return 0
  return Math.max(0, now - startedAt)
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

const STAGE_ORDER: GenerateStage[] = ['queued', 'running', 'done']

function GenerateProgress({
  stage,
  elapsedMs,
  hasExistingHtml,
}: {
  stage: GenerateStage
  elapsedMs: number
  hasExistingHtml: boolean
}) {
  const activeIndex = STAGE_ORDER.indexOf(stage)
  const headline =
    stage === 'error'
      ? 'Proses berhenti'
      : stage === 'done'
        ? 'Mockup siap'
        : 'Mockup berjalan di server…'

  const renderedSteps = GENERATE_STEPS.filter((step) => {
    if (stage === 'done') return true
    const stepIndex = STAGE_ORDER.indexOf(step.key)
    return stepIndex >= 0 && stepIndex <= Math.max(activeIndex, 0)
  })

  return (
    <div className="flex h-full min-h-[400px] flex-col bg-slate-50/60 p-5">
      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50">
          {stage === 'error' ? (
            <RefreshCw className="h-5 w-5 text-rose-500" />
          ) : (
            <Sparkles className="h-5 w-5 animate-pulse text-emerald-500" />
          )}
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-slate-950">{headline}</div>
          <div className="mt-0.5 text-xs text-slate-500">
            {stage === 'error'
              ? 'Coba klik Regenerate untuk enqueue ulang.'
              : stage === 'done'
                ? 'Hasil sudah tersedia di preview dan HTML source.'
                : 'Job berjalan tanpa batas waktu di server. Aman tinggalkan tab ini.'}
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-xs text-slate-700">
          <Clock className="h-3.5 w-3.5" />
          {formatElapsed(elapsedMs)}
        </div>
      </div>

      <ol className="mt-4 space-y-2.5">
        {renderedSteps.map((step) => {
          const stepIndex = STAGE_ORDER.indexOf(step.key)
          const isDone =
            (stage === 'done' && stepIndex <= activeIndex) ||
            (stage !== 'done' && stage !== 'error' && stepIndex < activeIndex)
          const isCurrent = !isDone && stage === step.key
          return (
            <li
              key={step.key}
              className={cn(
                'flex items-start gap-3 rounded-xl border bg-white px-3 py-2.5 transition',
                isCurrent
                  ? 'border-emerald-200 bg-emerald-50/60 shadow-sm'
                  : isDone
                    ? 'border-slate-200 bg-white text-slate-500'
                    : 'border-slate-100 bg-slate-50 text-slate-400',
              )}
            >
              <span className="mt-0.5 shrink-0">
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : isCurrent ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />
                ) : (
                  <Circle className="h-4 w-4 text-slate-300" />
                )}
              </span>
              <div className="flex-1 text-xs">
                <div className={cn('font-medium', isCurrent ? 'text-emerald-700' : 'text-slate-700')}>
                  {step.label}
                </div>
                <div className="mt-0.5 text-slate-400">{step.helper}</div>
              </div>
            </li>
          )
        })}
      </ol>

      {hasExistingHtml && stage !== 'error' && stage !== 'done' ? (
        <p className="mt-4 text-[11px] text-slate-400">
          HTML source di panel kiri dikunci sementara job berjalan di server. Preview akan diperbarui otomatis saat selesai.
        </p>
      ) : null}
    </div>
  )
}

function formatGenerateWarning(warning: string, fallback: boolean): string {
  if (!warning) return ''
  if (warning.includes('network') || warning.includes('timeout')) {
    return fallback
      ? 'AI provider lambat atau gagal, jadi ProspectFlow membuat template fallback agar kamu tetap bisa lanjut. Klik Regenerate untuk coba lagi.'
      : 'AI provider lambat atau gagal merespons. Coba klik Regenerate untuk coba lagi.'
  }
  if (warning.includes('rate_limit')) {
    return fallback
      ? 'AI provider sementara membatasi permintaan. Template fallback dipakai agar kamu bisa lanjut, coba Regenerate beberapa menit lagi.'
      : 'AI provider sementara membatasi permintaan. Coba Regenerate beberapa menit lagi.'
  }
  if (warning.includes('missing_key') || warning.includes('belum diset')) {
    return 'OPENAI_API_KEY belum diisi di .env.local, jadi ProspectFlow memakai template offline. Tambah key lalu Regenerate.'
  }
  return warning
}
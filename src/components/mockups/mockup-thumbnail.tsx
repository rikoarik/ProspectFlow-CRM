'use client'

import * as React from 'react'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MockupThumbnailProps {
  html?: string | null
  url?: string | null
  fallback?: boolean
  generatedAt?: string | null
  className?: string
  label?: string
}

export function MockupThumbnail({
  html,
  url,
  fallback,
  generatedAt,
  className,
  label = 'Mockup',
}: MockupThumbnailProps) {
  const hasInline = typeof html === 'string' && html.trim().length > 0
  const src = hasInline ? undefined : url || undefined

  if (!hasInline && !src) {
    return (
      <div
        className={cn(
          'flex h-32 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-500',
          className,
        )}
      >
        <Sparkles className="h-5 w-5 text-slate-400" />
        Belum ada mockup
      </div>
    )
  }

  return (
    <div
      className={cn('relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100', className)}
    >
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-slate-500">
        <span>{label}</span>
        <span className="flex items-center gap-1.5">
          {fallback ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-700">
              Offline template
            </span>
          ) : null}
          {generatedAt ? <span>{new Date(generatedAt).toLocaleDateString('id-ID')}</span> : null}
        </span>
      </div>
      {hasInline ? (
        <iframe
          title={`${label} preview`}
          sandbox="allow-same-origin"
          srcDoc={html}
          className="h-44 w-full bg-white"
          loading="lazy"
        />
      ) : (
        <iframe
          title={`${label} preview`}
          sandbox="allow-same-origin"
          src={src}
          className="h-44 w-full bg-white"
          loading="lazy"
        />
      )}
    </div>
  )
}
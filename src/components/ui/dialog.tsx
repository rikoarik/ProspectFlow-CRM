'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export function Dialog({ open, onOpenChange, children }: { open: boolean; onOpenChange: (v: boolean) => void; children: React.ReactNode }) {
  React.useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4" onClick={() => onOpenChange(false)}>
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  )
}

export function DialogContent({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className={cn('max-h-[90vh] w-[min(720px,calc(100vw-2rem))] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl', className)}
    >
      {children}
    </div>
  )
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-4 flex items-start justify-between gap-4', className)} {...props} />
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-lg font-semibold text-slate-950', className)} {...props} />
}

export function DialogClose({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="icon" onClick={onClick} aria-label="Close dialog">
      <X className="h-4 w-4" />
    </Button>
  )
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4',
        className,
      )}
      {...props}
    />
  )
}
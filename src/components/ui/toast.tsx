'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

type Toast = { id: string; title: string; description?: string; variant?: 'success' | 'error' | 'info' }

const ToastContext = React.createContext<{
  toast: (toast: Omit<Toast, 'id'>) => void
} | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])
  const toast = React.useCallback((input: Omit<Toast, 'id'>) => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts((t) => [...t, { ...input, id }])
    setTimeout(() => setToasts((t) => t.filter((item) => item.id !== id)), 3500)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'rounded-xl border bg-white p-4 shadow-lg',
              t.variant === 'success' && 'border-emerald-200',
              t.variant === 'error' && 'border-rose-200',
            )}
          >
            <div className="text-sm font-semibold text-slate-950">{t.title}</div>
            {t.description ? <div className="mt-1 text-sm text-slate-500">{t.description}</div> : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
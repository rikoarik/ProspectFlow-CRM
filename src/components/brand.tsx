import Link from 'next/link'
import { cn } from '@/lib/utils'

interface BrandMarkProps {
  className?: string
}

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <div
      className={cn(
        'relative h-11 w-11 overflow-hidden rounded-2xl bg-slate-950 ring-1 ring-white/15',
        className,
      )}
    >
      <div className="absolute inset-x-2 top-2 h-1 rounded-full bg-emerald-400" />
      <div className="absolute bottom-2 left-2 right-2 grid grid-cols-3 gap-1">
        <span className="h-5 rounded bg-emerald-500" />
        <span className="h-7 rounded bg-cyan-400" />
        <span className="h-4 rounded bg-blue-400" />
      </div>
    </div>
  )
}

interface BrandProps {
  className?: string
  variant?: 'light' | 'dark'
  href?: string
}

export function Brand({ className, variant = 'dark', href = '/' }: BrandProps) {
  const isLight = variant === 'light'
  return (
    <Link
      href={href}
      className={cn(
        'group flex items-center gap-3',
        isLight ? 'text-white' : 'text-slate-950',
        className,
      )}
    >
      <BrandMark />
      <div>
        <div className="text-lg font-black tracking-tight">ProspectFlow</div>
        <div
          className={cn(
            'text-xs font-semibold uppercase tracking-[0.28em]',
            isLight ? 'text-emerald-300' : 'text-emerald-600',
          )}
        >
          CRM
        </div>
      </div>
    </Link>
  )
}

import { ReactNode } from 'react'

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <div className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-emerald-600">{eyebrow}</div>
        ) : null}
        <h1 className="font-[var(--font-space)] text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          {title}
        </h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: { label: string; onClick?: () => void; href?: string }
}) {
  return (
    <Card className="flex flex-col items-center justify-center p-10 text-center">
      <div className="mb-4 rounded-2xl bg-emerald-50 p-3 text-emerald-600">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-slate-500">{description}</p>
      {action ? (
        <Button className="mt-5" variant="accent" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
    </Card>
  )
}
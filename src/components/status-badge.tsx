import { Badge } from '@/components/ui/badge'
import { priorityColor, statusColor } from '@/lib/design'
import type { Priority, ProspectStatus } from '@/lib/types'

export function StatusBadge({ status }: { status: ProspectStatus }) {
  return <Badge className={statusColor[status]}>{status}</Badge>
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <Badge className={priorityColor[priority]}>Priority {priority}</Badge>
}
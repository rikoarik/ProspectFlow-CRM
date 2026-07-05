import type { Prospect } from '@/lib/types'

export interface Scope {
  userId: string
  role: 'Admin' | 'Sales'
}

export function scopeProspectsByRole(rows: Prospect[], scope: Scope | null) {
  if (!scope || scope.role === 'Admin') return rows
  return rows.filter((row) => row.assigned_to === null || row.assigned_to === scope.userId)
}
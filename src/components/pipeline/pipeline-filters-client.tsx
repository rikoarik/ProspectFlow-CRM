'use client'

import * as React from 'react'
import { PipelineFilters } from '@/components/pipeline/pipeline-filters'
import { KanbanBoard } from '@/components/pipeline/kanban-board'
import type { PipelineView, Priority, Prospect, Sales } from '@/lib/types'

export function PipelineFiltersClient({
  prospects,
  sales,
  view,
}: {
  prospects: Prospect[]
  sales: Sales[]
  view: PipelineView
}) {
  const [query, setQuery] = React.useState('')
  const [priority, setPriority] = React.useState<'all' | Priority>('all')

  const shown = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return prospects.filter((prospect) => {
      if (priority !== 'all' && prospect.priority !== priority) return false
      if (!normalizedQuery) return true
      return (
        prospect.company_name.toLowerCase().includes(normalizedQuery) ||
        prospect.city.toLowerCase().includes(normalizedQuery)
      )
    }).length
  }, [prospects, query, priority])

  return (
    <div className="space-y-4">
      <PipelineFilters
        query={query}
        priority={priority}
        total={prospects.length}
        shown={shown}
        onQueryChange={setQuery}
        onPriorityChange={setPriority}
      />
      <KanbanBoard
        initialProspects={prospects}
        sales={sales}
        view={view}
        query={query}
        priority={priority}
      />
    </div>
  )
}

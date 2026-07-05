import { PageHeader } from '@/components/page-header'
import { PipelineFiltersClient } from '@/components/pipeline/pipeline-filters-client'
import { PipelineKpiStrip } from '@/components/pipeline/pipeline-kpi-strip'
import { PipelineViewTabs } from '@/components/pipeline/pipeline-view-tabs'
import { pipelineMetrics } from '@/lib/data/analytics'
import { getProspects, getSales } from '@/lib/data/queries'
import { parsePipelineView } from '@/lib/types'

type SearchParams = { view?: string | string[] }

export default async function PipelinePage({ searchParams }: { searchParams: SearchParams }) {
  const viewParam = Array.isArray(searchParams.view) ? searchParams.view[0] : searchParams.view
  const view = parsePipelineView(viewParam)

  const [prospects, sales] = await Promise.all([getProspects(), getSales()])
  const metrics = pipelineMetrics(prospects)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Kanban pipeline"
        title="Drag prospek antar status"
        description="Pindahkan card dari New sampai Deal. Setiap perubahan status tersimpan di data layer demo/Supabase."
        actions={<PipelineViewTabs current={view} />}
      />
      <PipelineKpiStrip metrics={metrics} />
      <PipelineFiltersClient prospects={prospects} sales={sales} view={view} />
    </div>
  )
}

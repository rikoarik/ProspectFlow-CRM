import { PageHeader } from '@/components/page-header'
import { KanbanBoard } from '@/components/pipeline/kanban-board'
import { getProspects, getSales } from '@/lib/data/queries'

export default async function PipelinePage() {
  const [prospects, sales] = await Promise.all([getProspects(), getSales()])
  return (
    <div>
      <PageHeader
        eyebrow="Kanban pipeline"
        title="Drag prospek antar status"
        description="Pindahkan card dari New sampai Deal. Setiap perubahan status tersimpan di data layer demo/Supabase."
      />
      <KanbanBoard initialProspects={prospects} sales={sales} />
    </div>
  )
}
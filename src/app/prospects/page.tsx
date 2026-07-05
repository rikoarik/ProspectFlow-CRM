import { PageHeader } from '@/components/page-header'
import { ProspectTable } from '@/components/prospects/prospect-table'
import { getProspects, getSales } from '@/lib/data/queries'

export default async function ProspectsPage() {
  const [prospects, sales] = await Promise.all([getProspects(), getSales()])
  return (
    <div>
      <PageHeader
        eyebrow="Prospect management"
        title="Prospect database"
        description="Search, filter, sort, bulk update, import, dan export prospek dari database riset."
      />
      <ProspectTable initialProspects={prospects} sales={sales} />
    </div>
  )
}
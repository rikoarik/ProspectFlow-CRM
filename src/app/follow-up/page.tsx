import { PageHeader } from '@/components/page-header'
import { FollowUpBoard } from '@/components/follow-up/follow-up-board'
import { getFollowUps, getProspects, getSales } from '@/lib/data/queries'

export default async function FollowUpPage() {
  const [followUps, prospects, sales] = await Promise.all([getFollowUps(), getProspects(), getSales()])
  return (
    <div>
      <PageHeader
        eyebrow="Follow up calendar"
        title="Jangan biarkan prospek hangat dingin"
        description="Lihat follow up hari ini, yang terlambat, dan minggu ini. Complete atau reschedule langsung dari halaman ini."
      />
      <FollowUpBoard initialFollowUps={followUps} prospects={prospects} sales={sales} />
    </div>
  )
}
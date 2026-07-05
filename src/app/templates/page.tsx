import { PageHeader } from '@/components/page-header'
import { TemplateLibrary } from '@/components/templates/template-library'
import { getProspects, getSales, getTemplates } from '@/lib/data/queries'

export default async function TemplatesPage() {
  const [templates, prospects, sales] = await Promise.all([getTemplates(), getProspects(), getSales()])
  return (
    <div>
      <PageHeader
        eyebrow="Outreach templates"
        title="Template pesan yang siap dipakai sales"
        description="Preview variabel dinamis, copy message, atau buka WhatsApp dengan pesan otomatis."
      />
      <TemplateLibrary templates={templates} prospects={prospects} sales={sales} />
    </div>
  )
}
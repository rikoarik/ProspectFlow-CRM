import { Database, ShieldCheck, UploadCloud } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function SettingsPage() {
  const hasSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  return (
    <div>
      <PageHeader
        eyebrow="Settings"
        title="Konfigurasi ProspectFlow"
        description="Status environment, Supabase connection, dan storage readiness untuk production."
      />
      <div className="grid gap-4 xl:grid-cols-3">
        <SettingCard icon={<Database className="h-5 w-5" />} title="Supabase database" status={hasSupabase ? 'Configured' : 'Not configured'} description={hasSupabase ? 'App membaca data operasional dari Supabase.' : 'Isi environment Supabase untuk mengaktifkan data operasional dan login tim.'} />
        <SettingCard icon={<ShieldCheck className="h-5 w-5" />} title="Auth & roles" status="Schema ready" description="profiles.role mendukung Admin/Sales. RLS policy ada di supabase/schema.sql." />
        <SettingCard icon={<UploadCloud className="h-5 w-5" />} title="Storage" status="Planned" description="attachments table siap; upload runtime bisa ditambahkan setelah bucket Supabase dibuat." />
      </div>
    </div>
  )
}

function SettingCard({ icon, title, status, description }: { icon: React.ReactNode; title: string; status: string; description: string }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">{icon}</div>
          <Badge>{status}</Badge>
        </div>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm leading-6 text-slate-600">{description}</CardContent>
    </Card>
  )
}
'use client'

import * as React from 'react'
import { Copy, ExternalLink, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import type { MessageTemplate, Prospect, Sales } from '@/lib/types'
import { buildWhatsAppUrl, interpolateTemplate, safeUrl } from '@/lib/utils'

export function TemplateLibrary({ templates, prospects, sales }: { templates: MessageTemplate[]; prospects: Prospect[]; sales: Sales[] }) {
  const [prospectId, setProspectId] = React.useState(prospects[0]?.id ?? '')
  const [salesId, setSalesId] = React.useState(sales.find((s) => s.role === 'Sales')?.id ?? sales[0]?.id ?? '')
  const { toast } = useToast()
  const prospect = prospects.find((p) => p.id === prospectId) ?? prospects[0]
  const salesPerson = sales.find((s) => s.id === salesId) ?? sales[0]

  function render(template: MessageTemplate) {
    return interpolateTemplate(template.content, {
      company_name: prospect?.company_name,
      industry: prospect?.industry,
      website: prospect?.website,
      problem_signal: prospect?.website_audit_signal,
      offer_angle: prospect?.offer_angle,
      sales_name: salesPerson?.full_name,
      contact_person: prospect?.contact_person || 'Pak/Bu',
    })
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text)
    toast({ title: 'Template copied', description: 'Pesan siap ditempel ke WhatsApp/email.', variant: 'success' })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Preview variables</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Select aria-label="Preview prospect" value={prospectId} onChange={(e) => setProspectId(e.target.value)}>
            {prospects.slice(0, 80).map((p) => <option key={p.id} value={p.id}>{p.company_name}</option>)}
          </Select>
          <Select aria-label="Preview sales person" value={salesId} onChange={(e) => setSalesId(e.target.value)}>
            {sales.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </Select>
        </CardContent>
      </Card>

      {templates.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {templates.map((template) => {
            const text = render(template)
            const waUrl = prospect?.phone ? buildWhatsAppUrl(prospect.phone, text) : ''
            return (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>{template.title}</CardTitle>
                      <div className="mt-2 flex gap-2"><Badge>{template.channel}</Badge><Badge>{template.category}</Badge></div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea readOnly value={text} className="min-h-44 bg-slate-50" />
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => copy(text)}><Copy className="h-4 w-4" /> Copy message</Button>
                    {waUrl ? <Button asChild variant="accent"><a href={waUrl} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" /> Open WhatsApp</a></Button> : null}
                    {prospect?.website ? <Button asChild variant="outline"><a href={safeUrl(prospect.website)} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /> Check website</a></Button> : null}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card><CardContent className="p-10 text-center text-slate-500">Buat template outreach pertama</CardContent></Card>
      )}
    </div>
  )
}
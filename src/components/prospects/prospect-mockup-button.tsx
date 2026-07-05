'use client'

import * as React from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { MockupStudio } from '@/components/mockups/mockup-studio'
import type { Audit, Prospect } from '@/lib/types'

interface ProspectMockupButtonProps {
  prospect: Prospect
  audit: Audit | null
}

export function ProspectMockupButton({ prospect, audit }: ProspectMockupButtonProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <Button variant="accent" onClick={() => setOpen(true)}>
        <Sparkles className="h-4 w-4" />
        Generate Web Mockup
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[min(1200px,calc(100vw-2rem))] max-w-none">
          <DialogHeader>
            <div>
              <DialogTitle>AI Web Mockup</DialogTitle>
              <p className="mt-1 text-xs text-slate-500">
                Generate mockup HTML untuk <span className="font-medium text-slate-700">{prospect.company_name}</span>{' '}
                berdasarkan data riset dan audit yang sudah kamu input.
              </p>
            </div>
            <DialogClose onClick={() => setOpen(false)} />
          </DialogHeader>
          <MockupStudio
            prospect={prospect}
            initialHtml={audit?.mockup_html ?? ''}
            initialUrl={audit?.mockup_url ?? ''}
            initialFallback={Boolean(audit?.mockup_fallback)}
            initialAuditId={audit?.id ?? null}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
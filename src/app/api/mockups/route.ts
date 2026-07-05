import { NextResponse } from 'next/server'
import { guardMutation } from '@/lib/auth/api-guard'
import { getProspect, saveAuditMockup } from '@/lib/data/queries'
import { sanitizeHtmlForStorage } from '@/lib/ai/sanitize'
import { uploadMockup } from '@/lib/mockups/storage'

export const runtime = 'nodejs'

interface SaveBody {
  prospect_id?: string
  audit_id?: string | null
  html?: string
}

export async function POST(request: Request) {
  const guard = await guardMutation()
  if (guard.response) return guard.response

  const body = (await request.json().catch(() => ({}))) as SaveBody
  if (!body.prospect_id || !body.html) {
    return NextResponse.json({ error: 'prospect_id dan html wajib diisi' }, { status: 400 })
  }

  const prospect = await getProspect(body.prospect_id)
  if (!prospect) {
    return NextResponse.json({ error: 'Prospect tidak ditemukan' }, { status: 404 })
  }

  

  const clean = sanitizeHtmlForStorage(body.html)

  let url = ''
  let path: string | null = null
  try {
    const result = await uploadMockup(prospect.id, body.audit_id ?? null, clean)
    if (result) {
      url = result.publicUrl
      path = result.path
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload gagal' },
      { status: 500 },
    )
  }

  const audit = await saveAuditMockup({
    auditId: body.audit_id ?? null,
    prospectId: prospect.id,
    url,
    html: clean,
    fallback: false,
  })

  return NextResponse.json({ url, path, audit_id: audit?.id ?? null })
}
import { NextResponse } from 'next/server'
import { guardMutation } from '@/lib/auth/api-guard'
import { getProspect, saveAuditMockup } from '@/lib/data/queries'
import { chatCompletion, AiError } from '@/lib/ai/client'
import { buildMockupPrompt, buildSystemPrompt, buildUserPrompt } from '@/lib/ai/prompt'
import { buildScaffold } from '@/lib/ai/fallback'
import { sanitizeHtmlForStorage } from '@/lib/ai/sanitize'
import { uploadMockup } from '@/lib/mockups/storage'
import { isAiConfigured } from '@/lib/env'

export const runtime = 'nodejs'
export const maxDuration = 60

interface GenerateBody {
  prospect_id?: string
  audit_id?: string | null
  brief?: string
}

export async function POST(request: Request) {
  const guard = await guardMutation()
  if (guard.response) return guard.response

  const body = (await request.json().catch(() => ({}))) as GenerateBody
  if (!body.prospect_id) {
    return NextResponse.json({ error: 'prospect_id wajib diisi' }, { status: 400 })
  }

  const prospect = await getProspect(body.prospect_id)
  if (!prospect) {
    return NextResponse.json({ error: 'Prospect tidak ditemukan' }, { status: 404 })
  }

  const input = buildMockupPrompt(prospect)
  let html = ''
  let fallback = false
  let aiError: string | null = null

  if (isAiConfigured()) {
    try {
      const raw = await chatCompletion({
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: buildUserPrompt(input, body.brief) },
        ],
        temperature: 0.7,
        maxTokens: 4096,
      })
      html = sanitizeHtmlForStorage(extractHtml(raw))
    } catch (err) {
      const message =
        err instanceof AiError
          ? `${err.code}: ${err.message}`
          : err instanceof Error
            ? err.message
            : 'AI error'
      aiError = message
      html = sanitizeHtmlForStorage(buildScaffold(prospect))
      fallback = true
    }
  } else {
    html = sanitizeHtmlForStorage(buildScaffold(prospect))
    fallback = true
  }

  if (html.length > 256 * 1024) {
    return NextResponse.json({ error: 'HTML hasil generate melebihi 256 KB' }, { status: 413 })
  }

  // Try upload; on failure still return the inline HTML so the user can copy it.
  let url = ''
  let uploadPath: string | null = null
  try {
    const result = await uploadMockup(prospect.id, body.audit_id ?? null, html)
    if (result) {
      url = result.publicUrl
      uploadPath = result.path
    }
  } catch (err) {
    aiError = `${aiError ? `${aiError} · ` : ''}upload gagal: ${err instanceof Error ? err.message : 'unknown'}`
  }

  const audit = await saveAuditMockup({
    auditId: body.audit_id ?? null,
    prospectId: prospect.id,
    url,
    html,
    fallback,
  })

  return NextResponse.json({
    html,
    url,
    path: uploadPath,
    fallback,
    audit_id: audit?.id ?? null,
    warning: aiError,
    model: process.env.OPENAI_MODEL ?? null,
  })
}

function extractHtml(raw: string): string {
  // If the model wrapped output in ``` fences, strip them.
  const fenced = raw.match(/```(?:html)?\s*([\s\S]*?)```/i)
  if (fenced) return fenced[1].trim()
  return raw.trim()
}
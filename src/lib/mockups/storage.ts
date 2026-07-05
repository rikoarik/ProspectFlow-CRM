import 'server-only'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { mockupsBucket } from '@/lib/env'

export interface UploadResult {
  path: string
  publicUrl: string
}

export async function uploadMockup(
  prospectId: string,
  auditId: string | null,
  html: string,
): Promise<UploadResult | null> {
  const supabase = getSupabaseAdminClient()
  if (!supabase) return null
  const bucket = mockupsBucket()
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const fileName = auditId ? `${auditId}-${stamp}.html` : `adhoc-${stamp}.html`
  const path = `prospect/${prospectId}/${fileName}`

  const blob = new Blob([html], { type: 'text/html; charset=utf-8' })
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: 'text/html; charset=utf-8',
    cacheControl: 'public, max-age=3600',
    upsert: false,
  })
  if (error) {
    throw new Error(`Upload mockup gagal: ${error.message}`)
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return { path, publicUrl: data.publicUrl }
}

export function getMockupPublicUrl(path: string): string | null {
  const supabase = getSupabaseAdminClient()
  if (!supabase) return null
  const { data } = supabase.storage.from(mockupsBucket()).getPublicUrl(path)
  return data.publicUrl
}
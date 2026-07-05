import 'server-only'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { mockupsBucket, supabaseStoragePublicBaseUrl } from '@/lib/env'

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
  return { path, publicUrl: resolvePublicUrl(bucket, path, data.publicUrl) }
}

function resolvePublicUrl(bucket: string, path: string, fallback: string) {
  const base = supabaseStoragePublicBaseUrl().replace(/\/$/, '')
  if (!base) return fallback
  return `${base}/${bucket}/${path}`
}

export function getMockupPublicUrl(path: string): string | null {
  const supabase = getSupabaseAdminClient()
  if (!supabase) return null
  const bucket = mockupsBucket()
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return resolvePublicUrl(bucket, path, data.publicUrl)
}
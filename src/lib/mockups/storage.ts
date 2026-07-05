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
  // If the generated HTML contains an inline <style>...</style>, extract it
  // and upload it as a separate .css file, then replace the style block
  // with a <link rel="stylesheet" href="..."> referencing the uploaded CSS.
  const styleMatch = html.match(/<style\b[^>]*>([\s\S]*?)<\/style>/i)
  let finalHtml = html
  if (styleMatch && styleMatch[1]) {
    const cssContent = styleMatch[1].trim()
    if (cssContent.length > 0) {
      const cssFileName = auditId ? `${auditId}-${stamp}.css` : `adhoc-${stamp}.css`
      const cssPath = `prospect/${prospectId}/${cssFileName}`
      const cssBlob = new Blob([cssContent], { type: 'text/css; charset=utf-8' })
      const { error: cssErr } = await supabase.storage.from(bucket).upload(cssPath, cssBlob, {
        contentType: 'text/css; charset=utf-8',
        cacheControl: 'public, max-age=3600',
        upsert: false,
      })
      if (cssErr) {
        // If uploading CSS fails, continue and keep inline styles rather than aborting.
        console.warn('Upload CSS failed, keeping inline styles:', cssErr.message)
      } else {
        const { data: cssData } = supabase.storage.from(bucket).getPublicUrl(cssPath)
        const cssPublic = resolvePublicUrl(bucket, cssPath, cssData.publicUrl)
        // Replace the first <style>...</style> with a stylesheet link
        finalHtml = html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/i, `<link rel="stylesheet" href="${cssPublic}">`)
      }
    }
  }

  const blob = new Blob([finalHtml], { type: 'text/html; charset=utf-8' })
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
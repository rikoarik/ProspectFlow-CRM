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
  // Extract all <style>...</style> blocks and upload combined CSS as one file.
  const styleRegex = /<style\b[^>]*>([\s\S]*?)<\/style>/gi
  const cssParts: string[] = []
  let mm: RegExpExecArray | null
  while ((mm = styleRegex.exec(html)) !== null) {
    if (mm[1]) cssParts.push(mm[1].trim())
  }
  let finalHtml = html
  if (cssParts.length > 0) {
    const cssContent = cssParts.join('\n\n')
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
        console.warn('Upload CSS failed, keeping inline styles:', cssErr.message)
      } else {
        const { data: cssData } = supabase.storage.from(bucket).getPublicUrl(cssPath)
        const cssPublic = resolvePublicUrl(bucket, cssPath, cssData.publicUrl)
        // Remove all style blocks and insert a single link to the uploaded CSS
        finalHtml = html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
        if (/<head\b/i.test(finalHtml)) {
          finalHtml = finalHtml.replace(/<head\b([^>]*)>/i, `<head$1><link rel="stylesheet" href="${cssPublic}">`)
        } else if (/<html\b/i.test(finalHtml)) {
          finalHtml = finalHtml.replace(/<html\b([^>]*)>/i, `<html$1><head><link rel="stylesheet" href="${cssPublic}"></head>`)
        } else if (/<!doctype html>/i.test(finalHtml)) {
          finalHtml = finalHtml.replace(/<!(doctype|DOCTYPE)\s+html>/i, (m) => `${m}\n<head><link rel="stylesheet" href="${cssPublic}"></head>`)
        } else {
          finalHtml = `<!DOCTYPE html><head><link rel="stylesheet" href="${cssPublic}"></head>${finalHtml}`
        }
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
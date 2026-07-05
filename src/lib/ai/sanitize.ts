import 'server-only'

const CSP_META = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'">`

/**
 * Defense-in-depth for AI-generated mockup HTML before it goes into a sandboxed iframe.
 * The iframe sandbox (allow-same-origin only, no allow-scripts) is the primary wall;
 * this layer just stops obvious footguns from ever reaching storage.
 */
export function sanitizeHtmlForStorage(input: string): string {
  let html = input ?? ''

  // Strip <script>...</script> blocks (case-insensitive, multiline).
  html = html.replace(/<script\b[\s\S]*?<\/script\s*>/gi, '')

  // Strip on*="..." inline event handlers.
  html = html.replace(/\s(on[a-z]+)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')

  // Neutralize javascript: URLs in href / src attributes.
  html = html.replace(/(href|src|action|formaction)\s*=\s*("javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]+)/gi, '$1="#"')

  // Ensure target=_blank links get rel=noopener noreferrer
  html = html.replace(/<a\b([^>]*?)\btarget="_blank"([^>]*?)>/gi, (match, before, after) => {
    const merged = `${before} ${after}`
    if (/rel\s*=/i.test(merged)) {
      return match.replace(/rel\s*=\s*("[^"]*"|'[^']*')/i, (relMatch) =>
        relMatch.replace(/^rel\s*=\s*"([^"]*)"$/i, 'rel="noopener noreferrer $1"'),
      )
    }
    return `<a${before} target="_blank" rel="noopener noreferrer"${after}>`
  })

  // Inject CSP meta after <head>. If no <head>, prepend one.
  if (/<head\b/i.test(html)) {
    html = html.replace(/<head\b([^>]*)>/i, `<head$1>${CSP_META}`)
  } else if (/<html\b/i.test(html)) {
    html = html.replace(/<html\b([^>]*)>/i, `<html$1><head>${CSP_META}</head>`)
  } else if (/<!doctype html>/i.test(html)) {
    html = html.replace(/<!(doctype|DOCTYPE)\s+html>/i, (m) => `${m}\n<head>${CSP_META}</head>`)
  } else {
    html = `<!DOCTYPE html><head>${CSP_META}</head>${html}`
  }

  return html
}
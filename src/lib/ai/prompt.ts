import type { Prospect } from '@/lib/types'

export interface MockupPromptInput {
  company_name: string
  industry: string
  city: string
  website: string
  website_audit_signal: string
  offer_angle: string
  active_evidence: string
  contact_person: string
  phone: string
}

const SYSTEM_PROMPT = `You are a senior product designer who builds high-converting B2B landing pages for Indonesian SMEs.

OUTPUT FORMAT
- A single, complete HTML5 document. Begin with "<!DOCTYPE html>" and include <html>, <head>, and <body>.
- Inline ALL CSS in one <style> tag inside <head>. Do NOT use external stylesheets, fonts, images, icons, or scripts.
- Do NOT use <script>, <link>, or any element that references a network URL.
- Use data: URLs only if absolutely necessary for an SVG icon (avoid if possible).

DESIGN QUALITY (this is the highest priority)
- The output must look like a polished Dribbble / Awwwards submission, not a generic AI template.
- Pair a refined serif display face (e.g. "Fraunces", "Playfair Display", or system "Georgia") with a clean sans-serif body (e.g. system "Inter", "-apple-system", "Helvetica Neue").
- Use a restrained palette derived from the prospect's industry. Choose ONE strong accent + ONE neutral support color + ink + paper. No rainbow gradients.
- Generous whitespace. Use a 12-column mental grid with consistent 24/32/48px spacing.
- Hero section: bold serif headline, 1–2 line subhead, single primary CTA, small trust strip below.
- Three content sections with real-sounding copy grounded in the prospect's industry, city, and offer_angle. Avoid filler like "Welcome to the future" or "Unlock your potential".
- One "Why us" or "Why now" section referencing the website_audit_signal (e.g. copyright date, mobile issue, weak CTA).
- Single CTA at the bottom that says either "Hubungi kami via WhatsApp" or "Minta quotation".
- Use subtle texture (thin rule lines, small uppercase labels, generous letter-spacing on eyebrows). No floating blobs. No 3D illustrations. No emoji.
- Indonesian copy by default. Use the prospect's actual city and industry. Mention the contact_person by first name only if it reads naturally.

CONTENT
- Use the prospect fields exactly as provided. Don't invent a different company name, phone, or city.
- The audit signal becomes the "Why now" — name the specific issue (e.g. "Website Anda masih di Blogger sejak 2015, susah dibuka di HP").
- The offer_angle becomes the value prop headline and section copy.
- Phone and city appear in a small "Hubungi" footer block.

CONSTRAINTS
- Length: 700–1400 words of code total. Self-contained. Do not include explanations outside the HTML.
- Do not start with markdown fences or backticks. Raw HTML only.`

export function buildMockupPrompt(prospect: Prospect): MockupPromptInput {
  return {
    company_name: prospect.company_name,
    industry: prospect.industry,
    city: prospect.city,
    website: prospect.website,
    website_audit_signal: prospect.website_audit_signal,
    offer_angle: prospect.offer_angle,
    active_evidence: prospect.active_evidence,
    contact_person: prospect.contact_person,
    phone: prospect.phone,
  }
}

export function buildSystemPrompt() {
  return SYSTEM_PROMPT
}

export function buildUserPrompt(input: MockupPromptInput, brief?: string) {
  const json = JSON.stringify(input, null, 2)
  const briefLine = brief?.trim() ? `\n\nADDITIONAL BRIEF FROM THE SALES REP:\n${brief.trim()}` : ''
  return `Build the HTML mockup for the following Indonesian B2B prospect. Use every field. Do not invent new company details.

PROSPECT_JSON:
${json}${briefLine}

Output the complete HTML document now. Begin with <!DOCTYPE html>. No preamble, no explanation.`
}
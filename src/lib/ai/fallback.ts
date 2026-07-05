import type { Prospect } from '@/lib/types'

interface IndustryPalette {
  paper: string
  ink: string
  accent: string
  support: string
  serif: string
  motif: string
  motifNote: string
  cta: string
}

const PALETTES: Record<string, IndustryPalette> = {
  manufacturing: {
    paper: '#F5F2EC',
    ink: '#1A1814',
    accent: '#B9531C',
    support: '#3F4644',
    serif: '"Fraunces", Georgia, serif',
    motif: 'factory',
    motifNote: 'Sertifikasi & lini produksi',
    cta: 'Minta quotation',
  },
  distribusi: {
    paper: '#F8FAFC',
    ink: '#0F172A',
    accent: '#047857',
    support: '#0EA5E9',
    serif: '"Fraunces", Georgia, serif',
    motif: 'route',
    motifNote: 'Distribusi & coverage area',
    cta: 'Diskusi WhatsApp',
  },
  logistics: {
    paper: '#F4F7F9',
    ink: '#0B1220',
    accent: '#0EA5E9',
    support: '#F59E0B',
    serif: '"Fraunces", Georgia, serif',
    motif: 'route',
    motifNote: 'Rute & jadwal pengiriman',
    cta: 'Cek tarif',
  },
  marine: {
    paper: '#F8FAFC',
    ink: '#0F172A',
    accent: '#0E7490',
    support: '#F97316',
    serif: '"Fraunces", Georgia, serif',
    motif: 'route',
    motifNote: 'Layanan marine & shipping',
    cta: 'Diskusi kebutuhan',
  },
  construction: {
    paper: '#F5F2EA',
    ink: '#161412',
    accent: '#9A3412',
    support: '#374151',
    serif: '"Fraunces", Georgia, serif',
    motif: 'gallery',
    motifNote: 'Portofolio & proyek',
    cta: 'Jadwalkan site survey',
  },
  travel: {
    paper: '#FBF6EF',
    ink: '#1F1B16',
    accent: '#E11D48',
    support: '#F59E0B',
    serif: '"Fraunces", Georgia, serif',
    motif: 'itinerary',
    motifNote: 'Paket & destinasi',
    cta: 'Booking WhatsApp',
  },
  services: {
    paper: '#F7F6F2',
    ink: '#1F1F1F',
    accent: '#4338CA',
    support: '#0EA5E9',
    serif: '"Fraunces", Georgia, serif',
    motif: 'trust',
    motifNote: 'Klien & testimonial',
    cta: 'Hubungi tim',
  },
  default: {
    paper: '#FAFAF7',
    ink: '#101418',
    accent: '#10B981',
    support: '#0EA5E9',
    serif: '"Fraunces", Georgia, serif',
    motif: 'trust',
    motifNote: 'Klien & layanan',
    cta: 'Hubungi WhatsApp',
  },
}

function pickPalette(industry: string): IndustryPalette {
  const key = industry.toLowerCase()
  if (/(manufaktur|factory|pabrik|industri|tekstil|garment|konveksi|plastik)/.test(key)) return PALETTES.manufacturing
  if (/(distributor|distribusi|supplier|grosir)/.test(key)) return PALETTES.distribusi
  if (/(logistik|ekspedisi|shipping|transport|freight)/.test(key)) return PALETTES.logistics
  if (/(marine|kapal|pelayaran|perkapalan|barge|tongkang)/.test(key)) return PALETTES.marine
  if (/(kontraktor|konstruksi|arsitek|interior|renovasi|developer)/.test(key)) return PALETTES.construction
  if (/(travel|umroh|haji|tour|wisata|hotel)/.test(key)) return PALETTES.travel
  if (/(jasa|service|konsultan|consulting|agency|agensi|legal|hukum|akunting|finance)/.test(key)) return PALETTES.services
  return PALETTES.default
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function buildScaffold(prospect: Prospect): string {
  const palette = pickPalette(prospect.industry)
  const company = escapeHtml(prospect.company_name || 'Perusahaan Anda')
  const industry = escapeHtml(prospect.industry || 'Bisnis')
  const city = escapeHtml(prospect.city || 'Indonesia')
  const offer = escapeHtml(prospect.offer_angle || 'Solusi yang jelas untuk prospek yang tepat.')
  const signal = escapeHtml(prospect.website_audit_signal || 'Website belum mobile-friendly, susah ditemukan di pencarian, dan tidak ada CTA WhatsApp.')
  const evidence = escapeHtml(prospect.active_evidence || '')
  const contact = escapeHtml((prospect.contact_person || 'Tim Sales').split(/\s+/)[0])
  const phone = escapeHtml((prospect.phone || '').split(/[;|/]/)[0]?.trim() ?? '')

  const motifSection = renderMotif(palette.motif, palette, company, industry, city)

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${company} — Redesign Mockup</title>
<style>
:root {
  --paper: ${palette.paper};
  --ink: ${palette.ink};
  --accent: ${palette.accent};
  --support: ${palette.support};
  --serif: ${palette.serif};
  --sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: var(--sans);
  background: var(--paper);
  color: var(--ink);
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
}
.shell { max-width: 1080px; margin: 0 auto; padding: 0 28px; }
.eyebrow {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--accent);
}
.hero {
  padding: 96px 0 72px;
  border-bottom: 1px solid rgba(0,0,0,0.08);
}
.hero h1 {
  font-family: var(--serif);
  font-weight: 600;
  font-size: clamp(40px, 5vw, 64px);
  line-height: 1.05;
  margin-top: 24px;
  letter-spacing: -0.02em;
}
.hero h1 em { font-style: italic; color: var(--accent); }
.hero p.lede {
  margin-top: 22px;
  max-width: 620px;
  font-size: 18px;
  color: rgba(0,0,0,0.7);
}
.trust {
  margin-top: 48px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
  border-top: 1px solid rgba(0,0,0,0.1);
  padding-top: 24px;
}
.trust .item .num {
  font-family: var(--serif);
  font-size: 32px;
  font-weight: 600;
  color: var(--ink);
}
.trust .item .label {
  font-size: 12px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(0,0,0,0.5);
  margin-top: 4px;
}
.cta {
  display: inline-block;
  margin-top: 36px;
  padding: 14px 26px;
  background: var(--ink);
  color: var(--paper);
  border-radius: 999px;
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
  letter-spacing: 0.02em;
}
.cta:hover { background: var(--accent); }
section.block {
  padding: 80px 0;
  border-bottom: 1px solid rgba(0,0,0,0.07);
}
section.block .grid {
  margin-top: 32px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 28px;
}
.card {
  background: #ffffffcc;
  border: 1px solid rgba(0,0,0,0.06);
  border-radius: 16px;
  padding: 24px;
}
.card .tag {
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--accent);
  font-weight: 700;
}
.card h3 {
  font-family: var(--serif);
  font-size: 22px;
  margin-top: 12px;
  letter-spacing: -0.01em;
}
.card p { margin-top: 10px; font-size: 14px; color: rgba(0,0,0,0.65); }
.split {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: 56px;
  align-items: start;
}
.split .problem {
  background: var(--ink);
  color: var(--paper);
  border-radius: 18px;
  padding: 32px;
}
.split .problem h3 {
  font-family: var(--serif);
  font-size: 24px;
  line-height: 1.2;
}
.split .problem p { margin-top: 14px; color: rgba(255,255,255,0.7); font-size: 14px; }
.split .why h3 { font-family: var(--serif); font-size: 28px; line-height: 1.2; }
.split .why ul { margin-top: 16px; padding-left: 0; list-style: none; }
.split .why li {
  padding: 12px 0;
  border-top: 1px solid rgba(0,0,0,0.08);
  display: grid;
  grid-template-columns: 80px 1fr;
  gap: 12px;
  font-size: 14px;
}
.split .why li span.k {
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent);
  font-weight: 700;
}
footer {
  padding: 56px 0 80px;
}
footer .row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid rgba(0,0,0,0.08);
  padding-top: 28px;
  font-size: 13px;
  color: rgba(0,0,0,0.6);
}
@media (max-width: 720px) {
  .trust, section.block .grid, .split { grid-template-columns: 1fr; }
}
</style>
</head>
<body data-fallback="true">
<header class="hero">
  <div class="shell">
    <div class="eyebrow">${escapeHtml(industry)} · ${city}</div>
    <h1>${company} — lebih cepat ditemukan,<br/>lebih mudah di-<em>trust</em>.</h1>
    <p class="lede">${offer}</p>
    <a href="#" class="cta">${escapeHtml(palette.cta)} →</a>
    <div class="trust">
      <div class="item"><div class="num">${city !== '' ? '1' : '0'}</div><div class="label">Kota fokus</div></div>
      <div class="item"><div class="num">24/7</div><div class="label">Inquiry via WhatsApp</div></div>
      <div class="item"><div class="num">100%</div><div class="label">Mobile-first</div></div>
    </div>
  </div>
</header>

${motifSection}

<section class="block">
  <div class="shell split">
    <div class="problem">
      <div class="eyebrow" style="color: var(--accent)">Sinyal audit</div>
      <h3>${signal}</h3>
      <p>${evidence || 'Biar calon klien tidak kabur sebelum sempat lihat penawaran Anda, struktur dan pesan website perlu dirombak.'}</p>
    </div>
    <div class="why">
      <div class="eyebrow">Kenapa sekarang</div>
      <h3>Website Anda sudah waktunya untuk tampil seperti tim profesional.</h3>
      <ul>
        <li><span class="k">Mobile</span><span>Layout responsif, tap target jelas, loading cepat.</span></li>
        <li><span class="k">CTA</span><span>Tombol WhatsApp muncul di tiap section, bukan tersembunyi.</span></li>
        <li><span class="k">Trust</span><span>Testimoni, portofolio, dan alamat fisik tampil jelas.</span></li>
      </ul>
    </div>
  </div>
</section>

<footer>
  <div class="shell">
    <div class="row">
      <div>
        <div style="font-family: var(--serif); font-size: 18px; color: var(--ink)">${company}</div>
        <div>${city} · ${escapeHtml(palette.motifNote)}</div>
      </div>
      <div>Hubungi ${contact}${phone ? ` · ${phone}` : ''}</div>
    </div>
  </div>
</footer>
</body>
</html>`
}

function renderMotif(motif: string, palette: IndustryPalette, company: string, industry: string, city: string) {
  const tag = `${industry} · ${city}`
  if (motif === 'route') {
    return `<section class="block">
  <div class="shell">
    <div class="eyebrow">Coverage area</div>
    <h2 style="font-family: ${palette.serif}; font-size: 32px; margin-top: 16px; max-width: 720px;">${company} menjangkau titik-titik utama ${city} dan sekitarnya setiap minggunya.</h2>
    <div class="grid">
      <div class="card"><div class="tag">Rute tetap</div><h3>Jadwal mingguan</h3><p>Pengiriman dan kunjungan sales punya jadwal yang bisa dicek di kalender publik.</p></div>
      <div class="card"><div class="tag">Titik distribusi</div><h3>Multi-drop</h3><p>Satu truk, banyak titik drop. Klien tidak perlu ke gudang untuk mengambil barang.</p></div>
      <div class="card"><div class="tag">Coverage</div><h3>${tag}</h3><p>Bidang industri ${industry}. Klien B2B di ${city} sudah percaya layanan kami.</p></div>
    </div>
  </div>
</section>`
  }
  if (motif === 'gallery') {
    return `<section class="block">
  <div class="shell">
    <div class="eyebrow">Portofolio</div>
    <h2 style="font-family: ${palette.serif}; font-size: 32px; margin-top: 16px; max-width: 720px;">Proyek ${industry.toLowerCase()} terbaru yang sudah kami selesaikan untuk klien ${city}.</h2>
    <div class="grid">
      <div class="card"><div class="tag">2024</div><h3>Renovasi kantor klien</h3><p>Luasan 320 m², durasi 8 minggu, selesai tepat waktu.</p></div>
      <div class="card"><div class="tag">2024</div><h3>Pabrik klien</h3><p>Workshop baja, instalasi listrik, dan finishing dalam 12 minggu.</p></div>
      <div class="card"><div class="tag">2023</div><h3>Interior showroom</h3><p>Custom joinery dan tata cahaya untuk retail klien.</p></div>
    </div>
  </div>
</section>`
  }
  if (motif === 'itinerary') {
    return `<section class="block">
  <div class="shell">
    <div class="eyebrow">Paket pilihan</div>
    <h2 style="font-family: ${palette.serif}; font-size: 32px; margin-top: 16px; max-width: 720px;">${company} merangkai itinerary singkat yang elegan untuk tur singkat Anda.</h2>
    <div class="grid">
      <div class="card"><div class="tag">2 Hari</div><h3>Quick escape</h3><p>City break singkat, hotel butik, makan malam fine dining.</p></div>
      <div class="card"><div class="tag">4 Hari</div><h3>Signature route</h3><p>Highlight kota + desa, transportasi pribadi, dokumentasi foto.</p></div>
      <div class="card"><div class="tag">7 Hari</div><h3>Full journey</h3><p>Multi-kota, mix budaya + alam, tour leader lokal.</p></div>
    </div>
  </div>
</section>`
  }
  // default: factory / services / trust
  return `<section class="block">
  <div class="shell">
    <div class="eyebrow">Layanan</div>
    <h2 style="font-family: ${palette.serif}; font-size: 32px; margin-top: 16px; max-width: 720px;">${company} — fokus melayani ${industry.toLowerCase()} di ${city} dengan standar yang jelas.</h2>
    <div class="grid">
      <div class="card"><div class="tag">Layanan 1</div><h3>Konsultasi kebutuhan</h3><p>Mulai dari briefing singkat WhatsApp, lalu kami susun rencana kerja dan estimasi.</p></div>
      <div class="card"><div class="tag">Layanan 2</div><h3>Eksekusi & delivery</h3><p>Tim kami kerjakan dengan timeline yang disepakati di awal, update mingguan.</p></div>
      <div class="card"><div class="tag">Layanan 3</div><h3>After-sales</h3><p>Garansi 30 hari untuk setiap delivery, plus support channel WhatsApp prioritas.</p></div>
    </div>
  </div>
</section>`
}
// Schlanker PDF-Schreiber: jede Seite ist ein JPEG, darüber liegen klickbare Link-Felder.

export interface PdfLink {
  /** Rechteck in Punkt, Ursprung oben links. */
  x: number
  y: number
  w: number
  h: number
  url: string
}

export interface PdfPage {
  jpeg: Uint8Array
  /** Pixelmaße des JPEG. */
  px: { w: number; h: number }
  links: PdfLink[]
}

export const A4 = { w: 595.28, h: 841.89 }

const enc = new TextEncoder()
const num = (n: number) => (Math.round(n * 100) / 100).toString()

/** Nur http und https, als reines ASCII (Sonderzeichen werden prozentkodiert). */
export function safeUrl(href: string): string | null {
  try {
    const u = new URL(href)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    return u.href
  } catch {
    return null
  }
}

const esc = (s: string) => s.replace(/[\\()]/g, (c) => `\\${c}`).replace(/[\r\n]/g, '')

function hex16(s: string): string {
  let out = 'FEFF'
  for (let i = 0; i < s.length; i++) out += s.charCodeAt(i).toString(16).padStart(4, '0')
  return `<${out}>`
}

export function buildPdf(pages: PdfPage[], title: string, size: { w: number; h: number } = A4, now = new Date()): Uint8Array {
  const objs: Uint8Array[] = []
  const add = (id: number, head: string, stream?: Uint8Array) => {
    const a = enc.encode(`${id} 0 obj\n${head}`)
    if (!stream) {
      objs[id] = concat([a, enc.encode('\nendobj\n')])
      return
    }
    objs[id] = concat([a, enc.encode('\nstream\n'), stream, enc.encode('\nendstream\nendobj\n')])
  }
  const kids: number[] = []
  let next = 4
  for (const p of pages) {
    const pageId = next++
    const contentId = next++
    const imageId = next++
    const annotIds = p.links.map(() => next++)
    kids.push(pageId)
    p.links.forEach((l, i) => {
      const x1 = l.x
      const x2 = l.x + l.w
      const y1 = size.h - (l.y + l.h)
      const y2 = size.h - l.y
      add(annotIds[i], `<< /Type /Annot /Subtype /Link /Rect [${num(x1)} ${num(y1)} ${num(x2)} ${num(y2)}] /Border [0 0 0] /A << /S /URI /URI (${esc(l.url)}) >> >>`)
    })
    const content = enc.encode(`q ${num(size.w)} 0 0 ${num(size.h)} 0 0 cm /Im0 Do Q`)
    add(contentId, `<< /Length ${content.length} >>`, content)
    add(imageId, `<< /Type /XObject /Subtype /Image /Width ${p.px.w} /Height ${p.px.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>`, p.jpeg)
    const annots = annotIds.length ? ` /Annots [${annotIds.map((n) => `${n} 0 R`).join(' ')}]` : ''
    add(pageId, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(size.w)} ${num(size.h)}] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R${annots} >>`)
  }
  add(1, '<< /Type /Catalog /Pages 2 0 R >>')
  add(2, `<< /Type /Pages /Count ${kids.length} /Kids [${kids.map((n) => `${n} 0 R`).join(' ')}] >>`)
  const d = now
  const stamp = `D:${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}${String(d.getUTCHours()).padStart(2, '0')}${String(d.getUTCMinutes()).padStart(2, '0')}${String(d.getUTCSeconds()).padStart(2, '0')}Z`
  add(3, `<< /Title ${hex16(title)} /Producer (Wishlist) /CreationDate (${stamp}) >>`)

  const header = enc.encode('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')
  const parts: Uint8Array[] = [header]
  const offsets: number[] = []
  let at = header.length
  for (let id = 1; id < next; id++) {
    offsets[id] = at
    parts.push(objs[id])
    at += objs[id].length
  }
  let xref = `xref\n0 ${next}\n0000000000 65535 f \n`
  for (let id = 1; id < next; id++) xref += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`
  xref += `trailer\n<< /Size ${next} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${at}\n%%EOF\n`
  parts.push(enc.encode(xref))
  return concat(parts)
}

function concat(parts: Uint8Array[]): Uint8Array {
  let n = 0
  for (const p of parts) n += p.length
  const out = new Uint8Array(n)
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}

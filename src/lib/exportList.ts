import { APP_NAME } from './brand'
import { drawIcon, iconOf, listIcon } from './icons'
import { isoLabel, longDate, priceText, toHref, withLocale } from './format'
import type { TFn } from './i18n'
import { A4, buildPdf, safeUrl, type PdfLink } from './pdf'
import type { Packable } from './backup'
import type { ReceivedCollection, ReceivedItem, StyleName } from './types'

/** Aussehen der Ausgabe nach den Einstellungen des Absenders. Ohne Angabe: hell wie früher. */
export interface ExportLook {
  scheme: 'light' | 'dark' | 'black'
  style: StyleName
  hue: number
  /** Rundung aus der Einstellung (1 = normal). */
  rk: number
}

export interface ExportInput {
  from: string
  hue: number
  lists: ReceivedCollection[]
  images: Packable
  t: TFn
  now?: number
  look?: ExportLook
}

const W = A4.w
const H = A4.h
const M = 40
const TOP = 44
const BOTTOM = 52
const THUMB = 62
const PAD = 11
const GAP = 9
const PDF_SCALE = 2.8
const PNG_WIDTH = 1080
/** Höchste Teilhöhe beim Bild (in Punkt), damit Handys keine zu großen Flächen zeichnen müssen. */
const PNG_MAX_H = 4800

const DISPLAY = '"Archivo Variable", Archivo, "Arial Narrow", system-ui, sans-serif'
const BODY = '"Instrument Sans Variable", "Instrument Sans", system-ui, -apple-system, "Segoe UI", sans-serif'

interface Pal {
  dark: boolean
  glass: boolean
  style: StyleName
  rk: number
  hue: number
  bg: string
  ink: string
  soft: string
  line: string
  card: string
  title: string
  accent: string
  heart: string
  rim: string
}

function palette(o: ExportInput): Pal {
  const l = o.look
  const scheme = l?.scheme ?? 'light'
  const hue = l?.hue ?? o.hue
  const style = l?.style ?? 'tag'
  const rk = l?.rk ?? 1
  const glass = style === 'glass'
  if (scheme === 'light') {
    return {
      dark: false, glass, style, rk, hue,
      bg: glass ? `hsl(${hue} 30% 95%)` : '#ffffff',
      ink: '#151a21', soft: '#5c6572', line: '#dfe4ea',
      card: glass ? 'rgba(255,255,255,0.62)' : style === 'calm' ? '#f1f4f8' : '#f5f7fa',
      title: glass ? 'rgba(255,255,255,0.6)' : tint(hue, 96),
      accent: accent(hue), heart: '#e0446a', rim: 'rgba(255,255,255,0.95)',
    }
  }
  const black = scheme === 'black'
  return {
    dark: true, glass, style, rk, hue,
    bg: glass ? (black ? '#050608' : '#0d1016') : black ? '#000000' : '#10131a',
    ink: '#f1f3f6', soft: '#9aa4b2', line: black ? '#262a32' : '#2a313d',
    card: glass ? 'rgba(255,255,255,0.075)' : black ? '#101216' : '#1a1f29',
    title: glass ? 'rgba(255,255,255,0.08)' : `hsl(${hue} 38% 16%)`,
    accent: `hsl(${hue} 72% 70%)`, heart: '#ff7b9c', rim: 'rgba(255,255,255,0.2)',
  }
}

/** Rundung je Stil, skaliert mit der Einstellung des Absenders. */
const radiusOf = (p: Pal, base: number, h: number) => Math.min(h / 2, Math.round(base * (p.style === 'calm' ? 1.35 : p.style === 'bold' ? 0.6 : p.glass ? 1.5 : 1) * p.rk))

function paintBackground(ctx: Ctx, p: Pal, h: number) {
  ctx.fillStyle = p.bg
  ctx.fillRect(0, 0, W, h)
  if (!p.glass) return
  const blob = (x: number, y: number, r: number, hue: number, a: number) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    const l = p.dark ? 52 : 78
    g.addColorStop(0, `hsla(${(hue + 360) % 360} ${p.dark ? 62 : 70}% ${l}% / ${a})`)
    g.addColorStop(1, `hsla(${(hue + 360) % 360} 60% ${l}% / 0)`)
    ctx.fillStyle = g
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }
  const k = p.dark ? 1 : 0.9
  for (let y0 = 0; y0 < h + 200; y0 += 820) {
    blob(W * 0.05, y0 + 60, 360, p.hue, 0.42 * k)
    blob(W * 1.0, y0 + 330, 320, p.hue + 70, 0.34 * k)
    blob(W * 0.15, y0 + 640, 360, p.hue - 60, 0.3 * k)
  }
}

type Ctx = CanvasRenderingContext2D

interface Row {
  kind: 'title' | 'head' | 'item'
  y: number
  h: number
  col?: ReceivedCollection
  item?: ReceivedItem
  lines?: string[]
  note?: string[]
  nameLines?: string[]
}

interface Page {
  rows: Row[]
  used: number
}

const accent = (hue: number) => `hsl(${hue} 62% 44%)`
const tint = (hue: number, l = 95) => `hsl(${hue} 70% ${l}%)`

function wrap(ctx: Ctx, text: string, width: number, maxLines: number): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ')
  const lines: string[] = []
  let cur = ''
  const fit = (s: string) => ctx.measureText(s).width <= width
  for (let w of words) {
    if (!w) continue
    while (!fit(w) && w.length > 1) {
      let n = w.length - 1
      while (n > 1 && !fit(w.slice(0, n))) n--
      if (cur) {
        lines.push(cur)
        cur = ''
      }
      lines.push(w.slice(0, n))
      w = w.slice(n)
    }
    const test = cur ? `${cur} ${w}` : w
    if (fit(test)) cur = test
    else {
      if (cur) lines.push(cur)
      cur = w
    }
  }
  if (cur) lines.push(cur)
  if (lines.length > maxLines) {
    const cut = lines.slice(0, maxLines)
    let last = cut[maxLines - 1]
    while (last.length > 1 && !fit(`${last}…`)) last = last.slice(0, -1)
    cut[maxLines - 1] = `${last.trimEnd()}…`
    return cut
  }
  return lines
}

function heart(ctx: Ctx, cx: number, cy: number, s: number, fill: boolean, color: string) {
  ctx.beginPath()
  ctx.moveTo(cx, cy + s * 0.9)
  ctx.bezierCurveTo(cx - s * 1.5, cy - s * 0.1, cx - s * 0.7, cy - s * 1.1, cx, cy - s * 0.35)
  ctx.bezierCurveTo(cx + s * 0.7, cy - s * 1.1, cx + s * 1.5, cy - s * 0.1, cx, cy + s * 0.9)
  ctx.closePath()
  if (fill) {
    ctx.fillStyle = color
    ctx.fill()
  } else {
    ctx.strokeStyle = color
    ctx.lineWidth = 0.9
    ctx.stroke()
  }
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r)
    return
  }
  const k = Math.min(r, w / 2, h / 2)
  ctx.moveTo(x + k, y)
  ctx.arcTo(x + w, y, x + w, y + h, k)
  ctx.arcTo(x + w, y + h, x, y + h, k)
  ctx.arcTo(x, y + h, x, y, k)
  ctx.arcTo(x, y, x + w, y, k)
  ctx.closePath()
}

const priceLine = (o: ExportInput, i: ReceivedItem) => (i.price === undefined ? undefined : withLocale(o.t.locale, () => priceText(i.price as number, i.cur).main))

/** Sortiert die wichtigsten Wünsche nach oben, sonst bleibt die Reihenfolge der Liste. */
function ordered(items: ReceivedItem[]): ReceivedItem[] {
  return items
    .map((it, n) => ({ it, n }))
    .sort((a, b) => (b.it.prio ?? 0) - (a.it.prio ?? 0) || a.n - b.n)
    .map((x) => x.it)
}

function layout(ctx: Ctx, o: ExportInput, maxH: number, fixedHeight: boolean): Page[] {
  const pages: Page[] = [{ rows: [], used: TOP }]
  const limit = maxH - BOTTOM
  let page = pages[0]
  const place = (row: Omit<Row, 'y'>, keepWith = 0) => {
    if (page.used + row.h + keepWith > limit && page.rows.length) {
      page = { rows: [], used: TOP }
      pages.push(page)
    }
    page.rows.push({ ...row, y: page.used })
    page.used += row.h
  }

  const first = pages[0]
  first.rows.push({ kind: 'title', y: first.used, h: 112 })
  first.used += 112

  for (const col of o.lists) {
    const items = ordered(col.items)
    const peek = (() => {
      const it = items[0]
      return it ? rowHeight(ctx, it).h + GAP : 0
    })()
    place({ kind: 'head', h: 46, col }, peek)
    for (const item of items) {
      const m = rowHeight(ctx, item)
      place({ kind: 'item', h: m.h, col, item, nameLines: m.name, note: m.note })
      page.used += GAP
    }
    page.used += 10
  }
  if (!fixedHeight) for (const p of pages) p.used = Math.min(maxH, p.used + 6)
  return pages
}

function textWidth(i: ReceivedItem): number {
  const rightCol = i.price !== undefined ? 92 : i.prio ? 48 : 0
  return W - 2 * M - 2 * PAD - THUMB - 14 - (rightCol ? rightCol + 10 : 0)
}

function rowHeight(ctx: Ctx, i: ReceivedItem): { h: number; name: string[]; note: string[] } {
  const tw = textWidth(i)
  ctx.font = `700 12.5px ${DISPLAY}`
  const name = wrap(ctx, i.name, tw, 2)
  ctx.font = `500 9.8px ${BODY}`
  const bits = [i.kind, i.note].filter(Boolean).join(' · ')
  const note = bits ? wrap(ctx, bits, tw, 3) : []
  const textH = name.length * 16 + (note.length ? 4 + note.length * 13 : 0)
  return { h: Math.max(THUMB, textH) + PAD * 2, name, note }
}

async function bitmapOf(o: ExportInput, id?: string): Promise<ImageBitmap | null> {
  if (!id) return null
  const rec = o.images.get(id)
  if (!rec) return null
  try {
    return await createImageBitmap(new Blob([rec.data], { type: rec.type || 'image/jpeg' }))
  } catch {
    return null
  }
}

function drawTitle(ctx: Ctx, o: ExportInput, y: number, count: number) {
  const t = o.t
  const P = palette(o)
  const a = P.accent
  const r = radiusOf(P, 18, 96)
  if (P.style === 'bold') {
    ctx.fillStyle = P.dark ? 'rgba(255,255,255,0.25)' : 'rgba(21,26,33,0.85)'
    roundRect(ctx, M + 1.5, y + 3, W - 2 * M, 96, r)
    ctx.fill()
  }
  ctx.fillStyle = P.title
  roundRect(ctx, M, y, W - 2 * M, 96, r)
  ctx.fill()
  if (P.glass || P.style === 'bold') {
    ctx.strokeStyle = P.style === 'bold' ? (P.dark ? 'rgba(255,255,255,0.55)' : 'rgba(21,26,33,0.85)') : P.rim
    ctx.lineWidth = P.style === 'bold' ? 1.6 : 1
    roundRect(ctx, M + 0.5, y + 0.5, W - 2 * M - 1, 95, r)
    ctx.stroke()
  }
  ctx.fillStyle = a
  if (P.style !== 'calm') {
    roundRect(ctx, M, y + 18, 5, 60, 3)
    ctx.fill()
  }
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = a
  ctx.font = `800 9.5px ${BODY}`
  ctx.letterSpacing = '1.6px'
  ctx.fillText(APP_NAME.toUpperCase(), M + 24, y + 30)
  ctx.letterSpacing = '0px'
  ctx.fillStyle = P.ink
  const title = t('Wunschliste von {name}', { name: o.from })
  let size = 26
  ctx.font = `800 ${size}px ${DISPLAY}`
  while (size > 15 && ctx.measureText(title).width > W - 2 * M - 48) {
    size -= 1
    ctx.font = `800 ${size}px ${DISPLAY}`
  }
  ctx.fillText(title, M + 24, y + 60)
  ctx.fillStyle = P.soft
  ctx.font = `600 10.5px ${BODY}`
  ctx.fillText(`${t.n(count, 'Wunsch', 'Wünsche')} · ${t('Stand {date}', { date: withLocale(t.locale, () => longDate(o.now ?? Date.now())) })}`, M + 24, y + 82)
}

function drawHead(ctx: Ctx, o: ExportInput, r: Row) {
  const col = r.col!
  const t = o.t
  const P = palette(o)
  const a = P.accent
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = P.ink
  const lic = listIcon(col.emoji)
  if (iconOf(lic)) {
    ctx.save()
    roundRect(ctx, M, r.y + 5, 26, 26, 8)
    ctx.clip()
    const g = ctx.createLinearGradient(M, r.y + 5, M + 26, r.y + 31)
    g.addColorStop(0, `hsl(${col.hue} 72% 64%)`)
    g.addColorStop(1, `hsl(${(col.hue + 35) % 360} 66% 46%)`)
    ctx.fillStyle = g
    ctx.fillRect(M, r.y + 5, 26, 26)
    ctx.restore()
    drawIcon(ctx, lic, M + 3.5, r.y + 8.5, 19)
  } else {
    ctx.font = `22px ${BODY}`
    ctx.fillText(col.emoji, M, r.y + 28)
  }
  ctx.font = `800 17px ${DISPLAY}`
  ctx.fillText(col.name, M + 32, r.y + 27)
  const right: string[] = []
  if (col.date) right.push(withLocale(t.locale, () => isoLabel(col.date as string)))
  right.push(t.n(col.items.length, 'Wunsch', 'Wünsche'))
  ctx.fillStyle = P.soft
  ctx.font = `600 10px ${BODY}`
  ctx.textAlign = 'right'
  ctx.fillText(right.join(' · '), W - M, r.y + 26)
  ctx.textAlign = 'left'
  ctx.fillStyle = a
  ctx.globalAlpha = 0.28
  ctx.fillRect(M, r.y + 38, W - 2 * M, 1.4)
  ctx.globalAlpha = 1
}

function drawItem(ctx: Ctx, o: ExportInput, r: Row, bmp: ImageBitmap | null, hue: number): PdfLink | null {
  const P = palette(o)
  const i = r.item!
  const x = M
  const w = W - 2 * M
  const cr = radiusOf(P, 12, r.h)
  if (P.style === 'bold') {
    ctx.fillStyle = P.dark ? 'rgba(255,255,255,0.22)' : 'rgba(21,26,33,0.8)'
    roundRect(ctx, x + 1, r.y + 2.6, w, r.h, cr)
    ctx.fill()
  }
  if (P.glass) {
    ctx.save()
    ctx.shadowColor = P.dark ? 'rgba(0,0,0,0.35)' : `hsla(${P.hue} 40% 30% / 0.18)`
    ctx.shadowBlur = 10
    ctx.shadowOffsetY = 4
    ctx.fillStyle = P.card
    roundRect(ctx, x, r.y, w, r.h, cr)
    ctx.fill()
    ctx.restore()
  }
  ctx.fillStyle = P.card
  roundRect(ctx, x, r.y, w, r.h, cr)
  ctx.fill()
  if (P.style !== 'calm') {
    ctx.strokeStyle = P.style === 'bold' ? (P.dark ? 'rgba(255,255,255,0.55)' : 'rgba(21,26,33,0.85)') : P.glass ? P.rim : P.line
    ctx.lineWidth = P.style === 'bold' ? 1.5 : 0.9
    roundRect(ctx, x + 0.45, r.y + 0.45, w - 0.9, r.h - 0.9, cr)
    ctx.stroke()
  }
  if (P.style === 'tag') {
    ctx.save()
    ctx.strokeStyle = P.line
    ctx.lineWidth = 1
    ctx.setLineDash([3, 3.5])
    ctx.beginPath()
    ctx.moveTo(x + THUMB + PAD * 2 + 3.5, r.y + 8)
    ctx.lineTo(x + THUMB + PAD * 2 + 3.5, r.y + r.h - 8)
    ctx.stroke()
    ctx.restore()
  }

  const ty = r.y + (r.h - THUMB) / 2
  const tx = x + PAD
  ctx.save()
  roundRect(ctx, tx, ty, THUMB, THUMB, Math.min(THUMB / 2, Math.round(10 * P.rk * (P.style === 'calm' ? 1.3 : 1))))
  ctx.clip()
  if (bmp) {
    ctx.fillStyle = '#fff'
    ctx.fillRect(tx, ty, THUMB, THUMB)
    const s = Math.max(THUMB / bmp.width, THUMB / bmp.height)
    const dw = bmp.width * s
    const dh = bmp.height * s
    ctx.drawImage(bmp, tx + (THUMB - dw) / 2, ty + (THUMB - dh) / 2, dw, dh)
  } else {
    if (iconOf(i.emoji)) {
      const h = i.hue ?? hue
      const g = ctx.createLinearGradient(tx, ty, tx + THUMB, ty + THUMB)
      g.addColorStop(0, `hsl(${h} 72% 64%)`)
      g.addColorStop(1, `hsl(${(h + 35) % 360} 66% 46%)`)
      ctx.fillStyle = g
      ctx.fillRect(tx, ty, THUMB, THUMB)
      const sz = THUMB * 0.66
      drawIcon(ctx, i.emoji, tx + (THUMB - sz) / 2, ty + (THUMB - sz) / 2, sz)
    } else {
      ctx.fillStyle = P.dark ? `hsl(${i.hue ?? hue} 40% 22%)` : tint(i.hue ?? hue, 91)
      ctx.fillRect(tx, ty, THUMB, THUMB)
      ctx.font = `28px ${BODY}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = P.ink
      ctx.fillText(i.emoji, tx + THUMB / 2, ty + THUMB / 2 + 2)
      ctx.textAlign = 'left'
    }
  }
  ctx.restore()
  if (bmp) {
    ctx.strokeStyle = 'rgba(0,0,0,0.07)'
    ctx.lineWidth = 0.8
    roundRect(ctx, tx + 0.4, ty + 0.4, THUMB - 0.8, THUMB - 0.8, Math.min(THUMB / 2, Math.round(10 * P.rk * (P.style === 'calm' ? 1.3 : 1))))
    ctx.stroke()
  }

  ctx.textBaseline = 'alphabetic'
  const nameLines = r.nameLines ?? []
  const noteLines = r.note ?? []
  const textH = nameLines.length * 16 + (noteLines.length ? 4 + noteLines.length * 13 : 0)
  let cy = r.y + (r.h - textH) / 2
  const nx = tx + THUMB + 14
  ctx.fillStyle = P.ink
  ctx.font = `700 12.5px ${DISPLAY}`
  for (const l of nameLines) {
    cy += 16
    ctx.fillText(l, nx, cy - 3.6)
  }
  if (noteLines.length) {
    cy += 4
    ctx.fillStyle = P.soft
    ctx.font = `500 9.8px ${BODY}`
    for (const l of noteLines) {
      cy += 13
      ctx.fillText(l, nx, cy - 3)
    }
  }

  const rx = x + w - PAD
  const price = priceLine(o, i)
  const hearts = i.prio ?? 0
  const blockH = (price ? 16 : 0) + (price && hearts ? 8 : 0) + (hearts ? 10 : 0)
  let ry = r.y + (r.h - blockH) / 2
  if (price) {
    ctx.fillStyle = P.ink
    ctx.font = `800 13px ${DISPLAY}`
    ctx.textAlign = 'right'
    ry += 13
    ctx.fillText(price, rx, ry)
    ctx.textAlign = 'left'
    ry += 3
    if (hearts) ry += 8
  }
  if (hearts) {
    const hs = 3.6
    const step = 10.5
    const c = P.heart
    for (let n = 0; n < 3; n++) heart(ctx, rx - hs * 1.5 - (2 - n) * step, ry + 5, hs, n < hearts, c)
  }

  const href = i.link ? safeUrl(toHref(i.link)) : null
  return href ? { x, y: r.y, w, h: r.h, url: href } : null
}

function drawFooter(ctx: Ctx, o: ExportInput, y: number, label: string, tip: boolean) {
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = palette(o).soft
  ctx.globalAlpha = 0.85
  ctx.font = `600 8.4px ${BODY}`
  ctx.fillText(tip ? `${o.t('Erstellt mit Wishlist')} · ${o.t('Wunsch antippen öffnet den Shop')}` : o.t('Erstellt mit Wishlist'), M, y)
  ctx.textAlign = 'right'
  ctx.fillText(label, W - M, y)
  ctx.textAlign = 'left'
  ctx.globalAlpha = 1
}

export interface RenderedPage {
  blob: Blob
  /** Pixelmaße. */
  px: { w: number; h: number }
  /** Punktmaße der Seite. */
  size: { w: number; h: number }
  links: PdfLink[]
}

async function fonts() {
  try {
    await Promise.all([document.fonts.load(`800 20px ${DISPLAY}`), document.fonts.load(`700 20px ${DISPLAY}`), document.fonts.load(`500 12px ${BODY}`), document.fonts.load(`800 12px ${BODY}`)])
  } catch {
    /* Ersatzschrift reicht */
  }
}

const toBlob = (c: HTMLCanvasElement, type: string, q?: number) =>
  new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('canvas'))), type, q))

interface RenderOpts {
  /** Nur die erste Seite, für die Vorschau. */
  first?: boolean
  /** Breite in Pixeln, überschreibt die Standardschärfe. */
  width?: number
}

async function render(o: ExportInput, mode: 'pdf' | 'png', opts: RenderOpts = {}): Promise<{ pages: RenderedPage[]; total: number }> {
  await fonts()
  const measure = document.createElement('canvas').getContext('2d')!
  const pdf = mode === 'pdf'
  const pages = layout(measure, o, pdf ? H : PNG_MAX_H, pdf)
  const total = o.lists.reduce((n, c) => n + c.items.length, 0)
  const anyLink = o.lists.some((c) => c.items.some((i) => i.link && safeUrl(toHref(i.link))))
  const out: RenderedPage[] = []
  const todo = opts.first ? pages.slice(0, 1) : pages
  const bmps = new Map<string, ImageBitmap | null>()
  for (const pg of todo) for (const r of pg.rows) {
    const id = r.item?.imageId
    if (id && !bmps.has(id)) bmps.set(id, await bitmapOf(o, id))
  }
  const P = palette(o)

  for (let n = 0; n < todo.length; n++) {
    const pg = todo[n]
    const hPt = pdf ? H : Math.max(260, pg.used + BOTTOM - 14)
    const scale = opts.width ? opts.width / W : pdf ? PDF_SCALE : PNG_WIDTH / W
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(W * scale)
    canvas.height = Math.round(hPt * scale)
    const ctx = canvas.getContext('2d')!
    ctx.scale(scale, scale)
    paintBackground(ctx, P, hPt)
    const links: PdfLink[] = []
    for (const r of pg.rows) {
      if (r.kind === 'title') drawTitle(ctx, o, r.y, total)
      else if (r.kind === 'head') drawHead(ctx, o, r)
      else {
        const l = drawItem(ctx, o, r, r.item!.imageId ? (bmps.get(r.item!.imageId) ?? null) : null, r.col!.hue)
        if (l) links.push(l)
      }
    }
    const label = pages.length > 1 ? (pdf ? o.t('Seite {n} von {m}', { n: n + 1, m: pages.length }) : o.t('Teil {n} von {m}', { n: n + 1, m: pages.length })) : ''
    drawFooter(ctx, o, hPt - 22, label, pdf && anyLink)
    const blob = await toBlob(canvas, opts.first ? 'image/jpeg' : pdf ? 'image/jpeg' : 'image/png', opts.first ? 0.86 : 0.9)
    out.push({ blob, px: { w: canvas.width, h: canvas.height }, size: { w: W, h: hPt }, links: pdf ? links : [] })
    canvas.width = 1
    canvas.height = 1
  }
  for (const b of bmps.values()) b?.close()
  return { pages: out, total: pages.length }
}

const bytesOf = async (b: Blob) => new Uint8Array(await b.arrayBuffer())

export async function makePdf(o: ExportInput): Promise<Uint8Array> {
  const { pages } = await render(o, 'pdf')
  const ready = await Promise.all(pages.map(async (p) => ({ jpeg: await bytesOf(p.blob), px: p.px, links: p.links })))
  return buildPdf(ready, o.t('Wunschliste von {name}', { name: o.from }), A4, new Date(o.now ?? Date.now()))
}

export async function makePngs(o: ExportInput): Promise<Uint8Array[]> {
  const { pages } = await render(o, 'png')
  return Promise.all(pages.map((p) => bytesOf(p.blob)))
}

/** Erste Seite als Vorschau (kleines JPEG) und Zahl aller Seiten bzw. Teile. */
export async function makePreview(o: ExportInput, kind: 'pdf' | 'png', width = 760): Promise<{ blob: Blob; px: { w: number; h: number }; pages: number }> {
  const { pages, total } = await render(o, kind, { first: true, width })
  return { blob: pages[0].blob, px: pages[0].px, pages: total }
}

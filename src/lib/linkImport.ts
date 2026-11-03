import { isNative } from './backupFiles'
import { CURRENCIES } from './format'
import { httpBytes, httpGet } from './http'

export interface Product {
  name?: string
  brand?: string
  image?: string
  price?: number
  currency?: string
  gtin?: string
  gtinOk?: boolean
  sources: string[]
}

export interface Diagnostics {
  status: number
  bytes: number
  type: string
  finalUrl: string
  ldBlocks: number
  productNode: boolean
  metaTags: number
}

export type LinkFail = 'off' | 'web' | 'invalid' | 'blocked' | 'notfound' | 'http' | 'network' | 'noproduct'

export class LinkError extends Error {
  constructor(
    public kind: LinkFail,
    public status = 0,
    public detail = '',
    public diag?: Diagnostics,
  ) {
    super(kind)
  }
}

export interface LinkResult {
  product: Product
  diag: Diagnostics
}

const MAX_HTML = 2_000_000
const UA = 'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'

const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', euro: '€', auml: 'ä', ouml: 'ö', uuml: 'ü', Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', szlig: 'ß', ndash: '–', mdash: '—', reg: '®', copy: '©', trade: '™', hellip: '…' }

export function decode(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => safeChar(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => safeChar(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, n: string) => ENT[n] ?? m)
    .replace(/\s+/g, ' ')
    .trim()
}

const safeChar = (n: number) => (n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '')

/** Zahl aus "1.299,00", "1299.00", "€ 49,9" oder 49.9. Ungültiges ergibt undefined. */
export function parsePrice(v: unknown): number | undefined {
  if (typeof v === 'number') return Number.isFinite(v) && v > 0 && v < 1e7 ? Math.round(v * 100) / 100 : undefined
  if (typeof v !== 'string') return undefined
  let s = v.replace(/[^\d.,]/g, '')
  if (!/\d/.test(s)) return undefined
  const dot = s.lastIndexOf('.')
  const comma = s.lastIndexOf(',')
  if (dot >= 0 && comma >= 0) {
    const dec = dot > comma ? '.' : ','
    s = s.split(dec === '.' ? ',' : '.').join('')
    s = s.replace(dec, '.')
  } else if (comma >= 0) {
    s = s.length - comma - 1 === 3 && s.indexOf(',') === comma ? s.replace(',', '') : s.replace(',', '.')
  } else if (dot >= 0) {
    if (s.length - dot - 1 === 3 && s.indexOf('.') === dot && dot <= 3) s = s.replace('.', '')
  }
  const n = Number.parseFloat(s)
  return Number.isFinite(n) && n > 0 && n < 1e7 ? Math.round(n * 100) / 100 : undefined
}

/** Prüfziffer von EAN-8, UPC (12), EAN-13 und GTIN-14. */
export function gtinValid(g: string): boolean {
  if (!/^\d{8}$|^\d{12,14}$/.test(g)) return false
  const d = g.split('').map(Number)
  const check = d.pop() as number
  let sum = 0
  d.reverse().forEach((n, i) => (sum += n * (i % 2 === 0 ? 3 : 1)))
  return (10 - (sum % 10)) % 10 === check
}

const asArray = <T>(v: T | T[] | undefined | null): T[] => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v])
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? decode(v) : undefined)

function typesOf(n: Record<string, unknown>): string[] {
  return asArray(n['@type'] as string | string[]).filter((x): x is string => typeof x === 'string').map((x) => x.replace(/^.*[/#]/, ''))
}

function collect(v: unknown, out: Record<string, unknown>[], depth = 0): void {
  if (depth > 8) return
  if (Array.isArray(v)) return v.forEach((x) => collect(x, out, depth + 1))
  if (!isObj(v)) return
  out.push(v)
  for (const k of ['@graph', 'mainEntity', 'mainEntityOfPage', 'itemListElement', 'item', 'hasVariant', 'isVariantOf']) collect(v[k], out, depth + 1)
}

function ldBlocks(html: string): unknown[] {
  const out: unknown[] = []
  const re = /<script[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi
  for (let m = re.exec(html); m; m = re.exec(html)) {
    const raw = m[1].replace(/^\s*(?:\/\/)?\s*<!\[CDATA\[|\]\]>\s*$/g, '').trim()
    try {
      out.push(JSON.parse(raw))
    } catch {
      /* kaputter Block, ignorieren */
    }
  }
  return out
}

function firstImage(v: unknown): string | undefined {
  for (const x of asArray(v as unknown)) {
    if (typeof x === 'string' && x.trim()) return x.trim()
    if (isObj(x)) {
      const u = str(x.url) ?? str(x.contentUrl)
      if (u) return u
    }
  }
  return undefined
}

function offersOf(node: Record<string, unknown>): { price?: number; currency?: string } {
  const list: Record<string, unknown>[] = []
  const walk = (o: unknown, d = 0) => {
    if (d > 4) return
    for (const x of asArray(o as unknown)) if (isObj(x)) (list.push(x), walk(x.offers, d + 1))
  }
  walk(node.offers)
  let best: { price?: number; currency?: string } = {}
  for (const o of list) {
    const specs = asArray(o.priceSpecification as unknown).filter(isObj)
    const price = parsePrice(o.price) ?? parsePrice(o.lowPrice) ?? specs.map((s) => parsePrice(s.price)).find((p) => p !== undefined)
    if (price === undefined) continue
    const currency = str(o.priceCurrency) ?? specs.map((s) => str(s.priceCurrency)).find(Boolean)
    if (best.price === undefined || price < best.price) best = { price, currency: currency?.toUpperCase() }
  }
  return best
}

const GTIN_KEYS = ['gtin13', 'gtin', 'gtin14', 'gtin12', 'gtin8', 'ean', 'isbn']

function fromJsonLd(blocks: unknown[]): Product | null {
  const nodes: Record<string, unknown>[] = []
  collect(blocks, nodes)
  const products = nodes.filter((n) => typesOf(n).some((t) => /^(Product|IndividualProduct|ProductModel|ProductGroup|Vehicle|Book)$/.test(t)))
  if (!products.length) return null
  const withOffer = products.find((p) => offersOf(p).price !== undefined) ?? products[0]
  const group = products.find((p) => typesOf(p).includes('ProductGroup'))
  const o = offersOf(withOffer)
  const gtinRaw = GTIN_KEYS.map((k) => withOffer[k]).find((v) => typeof v === 'string' || typeof v === 'number')
  const gtin = gtinRaw === undefined ? undefined : String(gtinRaw).replace(/\D/g, '') || undefined
  const brand = isObj(withOffer.brand) ? str(withOffer.brand.name) : str(withOffer.brand)
  return {
    name: str(withOffer.name) ?? (group ? str(group.name) : undefined),
    brand,
    image: firstImage(withOffer.image) ?? (group ? firstImage(group.image) : undefined),
    price: o.price,
    currency: o.currency,
    gtin,
    gtinOk: gtin ? gtinValid(gtin) : undefined,
    sources: ['JSON-LD'],
  }
}

function metaMap(html: string): { map: Map<string, string>; count: number } {
  const map = new Map<string, string>()
  let count = 0
  const re = /<meta\b([^>]*)>/gi
  for (let m = re.exec(html); m; m = re.exec(html)) {
    count++
    const attrs: Record<string, string> = {}
    const ar = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g
    for (let a = ar.exec(m[1]); a; a = ar.exec(m[1])) attrs[a[1].toLowerCase()] = a[2] ?? a[3] ?? ''
    const key = (attrs.property ?? attrs.name ?? attrs.itemprop ?? '').toLowerCase()
    const content = attrs.content
    if (key && content && !map.has(key)) map.set(key, content)
  }
  return { map, count }
}

function fromMeta(html: string): { product: Product; count: number } {
  const { map, count } = metaMap(html)
  const get = (...keys: string[]) => keys.map((k) => map.get(k)).find((v) => v && v.trim())
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
  const priceRaw = get('product:price:amount', 'og:price:amount', 'price', 'twitter:data1')
  const cur = get('product:price:currency', 'og:price:currency', 'pricecurrency')
  const gtinRaw = get('gtin13', 'gtin', 'product:ean', 'product:gtin', 'og:upc', 'og:ean')?.replace(/\D/g, '')
  const sources: string[] = []
  const name = get('og:title', 'twitter:title') ?? title
  const image = get('og:image:secure_url', 'og:image', 'twitter:image')
  const price = parsePrice(priceRaw)
  if (get('og:title', 'og:image', 'product:price:amount', 'og:price:amount')) sources.push('Open Graph')
  else if (price !== undefined || get('twitter:title', 'twitter:image')) sources.push('Meta-Angaben')
  else if (name) sources.push('Seitentitel')
  return {
    count,
    product: {
      name: name ? decode(name) : undefined,
      image: image?.trim(),
      price,
      currency: cur?.toUpperCase(),
      gtin: gtinRaw || undefined,
      gtinOk: gtinRaw ? gtinValid(gtinRaw) : undefined,
      sources,
    },
  }
}

const absolute = (u: string | undefined, base: string): string | undefined => {
  if (!u) return undefined
  try {
    const r = new URL(decode(u), base)
    return r.protocol === 'https:' || r.protocol === 'http:' ? r.href : undefined
  } catch {
    return undefined
  }
}

/** Liest Produktdaten aus dem HTML einer Produktseite. Reihenfolge: JSON-LD, dann Open Graph und Meta-Angaben. */
export function parseProduct(html: string, pageUrl: string): { product: Product; diag: Pick<Diagnostics, 'ldBlocks' | 'productNode' | 'metaTags'> } {
  const text = html.length > MAX_HTML ? html.slice(0, MAX_HTML) : html
  const blocks = ldBlocks(text)
  const ld = fromJsonLd(blocks)
  const meta = fromMeta(text)
  const sources = [...(ld?.sources ?? []), ...(meta.product.sources.length && (!ld || !ld.name || ld.price === undefined || !ld.image) ? meta.product.sources : [])]
  const product: Product = {
    name: ld?.name ?? meta.product.name,
    brand: ld?.brand,
    image: absolute(ld?.image ?? meta.product.image, pageUrl),
    price: ld?.price ?? meta.product.price,
    currency: ld?.price !== undefined ? ld.currency : meta.product.currency,
    gtin: ld?.gtin ?? meta.product.gtin,
    gtinOk: ld?.gtin ? ld.gtinOk : meta.product.gtinOk,
    sources: [...new Set(sources)],
  }
  return { product, diag: { ldBlocks: blocks.length, productNode: !!ld, metaTags: meta.count } }
}

/** Prüft die Eingabe: https-Adresse, kein lokales Netz. */
export function cleanUrl(input: string): string | null {
  let s = input.trim()
  if (!s) return null
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = `https://${s}`
  try {
    const u = new URL(s)
    if (u.protocol !== 'https:') return null
    const h = u.hostname.toLowerCase()
    if (!h.includes('.') || h === 'localhost' || /^(10|127|0)\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h) || h.endsWith('.local') || h.endsWith('.internal')) return null
    u.hash = ''
    return u.href
  } catch {
    return null
  }
}

const BLOCK_WORDS = /captcha|access denied|zugriff verweigert|are you a (human|robot)|unusual traffic|bot detection|robot check|verify you are human|pardon our interruption/i

/** Holt eine Produktseite und liest die Daten. Wirft LinkError mit der Ursache. */
export async function fetchProduct(input: string): Promise<LinkResult> {
  if (!isNative()) throw new LinkError('web')
  const url = cleanUrl(input)
  if (!url) throw new LinkError('invalid')
  let res
  try {
    res = await httpGet(url, { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5', 'Accept-Language': 'de-DE,de;q=0.9,en;q=0.6' })
  } catch (e) {
    throw new LinkError('network', 0, e instanceof Error ? e.message.slice(0, 120) : '')
  }
  const html = await res.text().catch(() => '')
  const base = { status: res.status, bytes: html.length, type: res.header('content-type') ?? '', finalUrl: res.url }
  const empty = { ...base, ldBlocks: 0, productNode: false, metaTags: 0 }
  if (res.status === 404 || res.status === 410) throw new LinkError('notfound', res.status, '', empty)
  if (res.status === 401 || res.status === 403 || res.status === 429 || res.status === 503) throw new LinkError('blocked', res.status, '', empty)
  if (!res.ok) throw new LinkError('http', res.status, '', empty)
  const { product, diag } = parseProduct(html, res.url || url)
  const d: Diagnostics = { ...base, ...diag }
  if (!product.name && product.price === undefined) throw new LinkError(BLOCK_WORDS.test(html.slice(0, 200_000)) ? 'blocked' : 'noproduct', res.status, '', d)
  return { product, diag: d }
}

export const knownCurrency = (c: string | undefined): c is string => !!c && CURRENCIES.includes(c)

/** Such-Adresse bei Idealo: mit EAN, wenn sie stimmt, sonst mit dem Namen. */
export const idealoSearch = (p: Pick<Product, 'name' | 'gtin' | 'gtinOk'>): string | null => {
  const q = p.gtin && p.gtinOk ? p.gtin : p.name?.slice(0, 120)
  return q ? `https://www.idealo.de/preisvergleich/MainSearchProductCategory.html?q=${encodeURIComponent(q)}` : null
}

const IMAGE_LIMIT = 8_000_000

/** Erste Webadresse aus einem Text, zum Beispiel aus „Schau mal: https://…“. */
export function extractUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s<>"'„“”]+/i)
  if (!m) return null
  return m[0].replace(/[).,;!?]+$/, '')
}

/** Lädt das Produktbild als Rohdaten. Gibt null zurück, wenn es nicht klappt, das Bild ist nie Pflicht. */
export async function fetchImageBytes(src: string): Promise<{ type: string; data: ArrayBuffer } | null> {
  if (!isNative()) return null
  const url = cleanUrl(src.replace(/^http:\/\//i, 'https://'))
  if (!url) return null
  try {
    const r = await httpBytes(url, { 'User-Agent': UA, Accept: 'image/avif,image/webp,image/jpeg,image/png,*/*;q=0.5' })
    if (!r.ok || !r.data.byteLength || r.data.byteLength > IMAGE_LIMIT) return null
    if (r.type && !/^image\/(?!svg)|octet-stream/i.test(r.type)) return null
    return { type: r.type || 'image/jpeg', data: r.data }
  } catch {
    return null
  }
}

export function linkFailText(e: unknown): string {
  const kind = e instanceof LinkError ? e.kind : 'network'
  if (kind === 'web') return 'Link-Import geht nur in der Android-App. Im Browser blockieren Shops den Zugriff.'
  if (kind === 'invalid') return 'Das ist keine gültige https-Adresse.'
  if (kind === 'blocked') return 'Die Seite lässt die App nicht herein (Schutz vor Automaten). Probier einen anderen Shop oder den Hersteller.'
  if (kind === 'notfound') return 'Die Seite gibt es nicht (404). Stimmt der Link?'
  if (kind === 'http') return 'Die Seite antwortet mit einem Fehler.'
  if (kind === 'noproduct') return 'Auf der Seite sind keine Produktdaten zu finden. Ist es die Seite eines einzelnen Produkts?'
  return 'Keine Verbindung zur Seite. Bist du online?'
}

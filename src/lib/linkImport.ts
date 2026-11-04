import { isNative } from './backupFiles'
import { CURRENCIES, normalize } from './format'
import { httpBytes, httpGet } from './http'
import { netReason } from './netReason'

export interface Product {
  name?: string
  brand?: string
  image?: string
  price?: number
  currency?: string
  gtin?: string
  gtinOk?: boolean
  category?: string
  /** Preis stammt aus dem Fließtext der Seite und ist nur geraten. */
  priceGuess?: boolean
  /** Bild stammt aus dem Seitenaufbau (nicht aus den Produktdaten) und ist nur geraten. */
  imageGuess?: boolean
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
  imgTags: number
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

function categoryOf(n: Record<string, unknown>): string | undefined {
  const raw = asArray(n.category as unknown).map((x) => (isObj(x) ? str(x.name) : typeof x === 'string' ? x : undefined)).find((x): x is string => !!x?.trim())
  if (!raw) return undefined
  const last = raw.split(/\s*[>/|,]\s*/).filter(Boolean).pop()?.trim()
  return last && last.length <= 40 && !/^\d+$/.test(last) ? decode(last) : undefined
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
    category: categoryOf(withOffer) ?? (group ? categoryOf(group) : undefined),
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

function fromMeta(html: string): { product: Product; count: number; title?: string; siteName?: string; ogTitle?: string } {
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
    title: title ? decode(title) : undefined,
    siteName: ((v) => (v ? decode(v) : undefined))(get('og:site_name')),
    ogTitle: ((v) => (v ? decode(v) : undefined))(get('og:title', 'twitter:title')),
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


const GENERIC_WORDS = new Set(['daten', 'preise', 'preis', 'technische', 'technisch', 'startseite', 'home', 'produkt', 'produkte', 'ubersicht', 'details', 'detail', 'spezifikation', 'spezifikationen', 'specifications', 'specification', 'price', 'prices', 'und', 'and', 'modelle', 'shop', 'online', 'kaufen', 'angebot', 'angebote', 'info', 'infos', 'data', 'overview', 'bestellen'])

const isGeneric = (seg: string): boolean => {
  const w = normalize(seg).split(' ').filter(Boolean)
  return w.length > 0 && w.every((x) => GENERIC_WORDS.has(x))
}

const brandLabel = (host: string): string => {
  const parts = host.toLowerCase().split('.').filter((x) => x !== 'www')
  return normalize(parts.length >= 2 ? parts[parts.length - 2] : parts[0] ?? '')
}

const splitTitle = (t: string): string[] => t.split(/\s+[|–—·•:]\s+|\s*\|\s*|:\s+|\s+-\s+/).map((x) => x.trim()).filter(Boolean)

/** Macht aus Seitentiteln wie "Daten und Preise | Honda | CBR650R | …" den Produktnamen "Honda CBR650R". */
export function refineName(raw: string | undefined, title: string | undefined, host: string, siteName?: string): string | undefined {
  const base = raw ?? title
  if (!base) return undefined
  const brand = brandLabel(host)
  const site = siteName ? normalize(siteName) : ''
  const isBrand = (seg: string) => {
    const n = normalize(seg).replace(/ (de|com|at|ch|eu|net|org)$/, '').trim()
    return !!n && (n === brand || n === site)
  }
  if (isGeneric(base) && title) {
    const parts = splitTitle(title)
    const cands = parts.filter((p) => !isGeneric(p) && !isBrand(p))
    if (!cands.length) return base
    const model = cands.find((p) => /\d/.test(p) && /[a-z]/i.test(p)) ?? cands[0]
    const brandSeg = parts.find(isBrand)
    return (brandSeg && !normalize(model).includes(normalize(brandSeg)) ? `${brandSeg} ` : '') + model
  }
  const lead = base.match(/^([^:|–—]{2,30}?)\s*[:|–—]\s+(\S.*)$/)
  if (lead && (/^[\w-]+\.(de|com|at|ch|eu|net|org|co\.uk)$/i.test(lead[1].trim()) || isBrand(lead[1]) || isBrand(lead[1].replace(/\.\w{2,3}$/, '')))) return lead[2].trim()
  const parts = splitTitle(base)
  if (parts.length > 1 && parts.slice(1).some(isBrand) && !isBrand(parts[0]) && !isGeneric(parts[0])) return parts[0]
  return base
}

/** Preis aus dem sichtbaren Text, nur mit Stichwort davor ("ab", "Preis", "UVP", …). Immer nur geraten. */
export function textPrice(html: string): number | undefined {
  const body = html
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/\s+/g, ' ')
  const amount = '((?:\\d{1,3}(?:\\.\\d{3})+|\\d+)(?:,\\d{1,2})?)'
  const key = '(?:ab|nur|preis|uvp|preisempfehlung|kostet|price|from)'
  const after = new RegExp(`\\b${key}\\b[^\\d€]{0,25}${amount}\\s*(?:€|eur\\b)`, 'i').exec(body)
  const before = new RegExp(`\\b${key}\\b[^\\d€]{0,25}(?:€|eur\\b)\\s*${amount}`, 'i').exec(body)
  const m = [after, before].filter((x): x is RegExpExecArray => !!x).sort((a, b) => a.index - b.index)[0]
  const v = m ? parsePrice(m[1]) : undefined
  return v !== undefined && v >= 1 && v < 1_000_000 ? v : undefined
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

const NOT_PRODUCT_IMAGE = /logo|icon|sprite|avatar|banner|pixel|tracking|spacer|badge|flag|placeholder|loading|blank|\.svg|\.gif|\.ico/i

const attrOf = (tag: string, name: string): string | undefined => {
  const m = tag.match(new RegExp(`(?:^|[\\s"'])${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'))
  const v = m?.[1] ?? m?.[2] ?? m?.[3]
  return v ? decode(v) : undefined
}

const declared = (tag: string, name: string): number => {
  const v = parseInt(attrOf(tag, name) ?? '', 10)
  return Number.isFinite(v) ? v : 0
}

/** Sucht im Seitenaufbau nach dem Hauptbild, wenn die Produktdaten keins nennen. Gibt auch die Zahl der gefundenen Bild-Tags zurück. */
export function imageFallback(html: string): { url?: string; imgTags: number } {
  const tags = html.match(/<img\b[^>]*>/gi) ?? []
  const imgTags = tags.length
  const best: { url?: string; area: number } = { area: 0 }
  const offer = (url: string | undefined, area: number) => {
    if (!url || NOT_PRODUCT_IMAGE.test(url) || url.startsWith('data:')) return
    if (area > best.area) {
      best.url = url
      best.area = area
    }
  }
  for (const tag of tags) {
    const dyn = attrOf(tag, 'data-a-dynamic-image')
    if (dyn) {
      try {
        const o = JSON.parse(dyn) as Record<string, unknown>
        for (const [u, dim] of Object.entries(o)) {
          const [w, h] = Array.isArray(dim) ? (dim as number[]) : [0, 0]
          offer(u, (Number(w) || 1) * (Number(h) || 1) + 1_000_000)
        }
      } catch {
        /* weiter */
      }
    }
    const hires = attrOf(tag, 'data-old-hires') ?? attrOf(tag, 'data-a-hires') ?? attrOf(tag, 'data-zoom-image') ?? attrOf(tag, 'data-large-image')
    if (hires) offer(hires, 2_000_000)
  }
  if (best.url) return { url: best.url, imgTags }
  const link = html.match(/<link\b[^>]*\brel\s*=\s*["']image_src["'][^>]*>/i)
  if (link) offer(attrOf(link[0], 'href'), 500_000)
  for (const tag of tags) {
    const src = attrOf(tag, 'src') ?? attrOf(tag, 'data-src') ?? attrOf(tag, 'data-lazy-src')
    const w = declared(tag, 'width')
    const h = declared(tag, 'height')
    const hinted = /\b(landingImage|imgBlkFront|main-image|product-image|primary-image)\b/i.test(tag)
    if ((w >= 250 && h >= 250) || hinted) offer(src, Math.max(w * h, 250 * 250) + (hinted ? 100_000 : 0))
  }
  return { url: best.url, imgTags }
}

/** Entfernt Markenzeichen und Leerraum. */
export const cleanName = (name: string): string => name.replace(/[®™©℗]/g, '').replace(/\s+/g, ' ').trim()

const TAIL_JUNK = /(?:\s+(?:und|and|mit|with|für|for|von|of|the|der|die|das|&|\+|-|–|\/))+$|[\s,;:&+\-–/]+$/i

/** Kürzt lange Shop-Titel stark: bleibt beim Kern bis zum ersten Komma, Strich oder zur ersten Klammer. */
export function shortenName(name: string, max = 64): string {
  const n = cleanName(name)
  if (n.length <= 48) return n
  const re = /,\s|\s[-–|]\s|\s[([]|;\s|\s\/\s/g
  let head = n
  for (let m = re.exec(n); m; m = re.exec(n)) {
    if (m.index >= 18) {
      head = n.slice(0, m.index)
      break
    }
  }
  if (head.length > max) {
    const cut = head.slice(0, max + 1)
    const sp = cut.lastIndexOf(' ')
    head = sp >= 24 ? cut.slice(0, sp) : cut.slice(0, max)
  }
  return head.replace(TAIL_JUNK, '').trim() || n.slice(0, max)
}

/** Name für das Formular: bereinigt, auf Wunsch stark gekürzt. */
export const tidyName = (name: string, short: boolean): string => (short ? shortenName(name) : cleanName(name))

/** Liest Produktdaten aus dem HTML einer Produktseite. Reihenfolge: JSON-LD, dann Open Graph und Meta-Angaben. */
export function parseProduct(html: string, pageUrl: string): { product: Product; diag: Pick<Diagnostics, 'ldBlocks' | 'productNode' | 'metaTags' | 'imgTags'> } {
  const text = html.length > MAX_HTML ? html.slice(0, MAX_HTML) : html
  const blocks = ldBlocks(text)
  const ld = fromJsonLd(blocks)
  const meta = fromMeta(text)
  const sources = [...(ld?.sources ?? []), ...(meta.product.sources.length && (!ld || !ld.name || ld.price === undefined || !ld.image) ? meta.product.sources : [])]
  const host = (() => {
    try {
      return new URL(pageUrl).hostname
    } catch {
      return ''
    }
  })()
  const product: Product = {
    name: ld?.name ?? refineName(meta.ogTitle ?? meta.product.name, meta.title, host, meta.siteName),
    brand: ld?.brand,
    image: absolute(ld?.image ?? meta.product.image, pageUrl),
    price: ld?.price ?? meta.product.price,
    currency: ld?.price !== undefined ? ld.currency : meta.product.currency,
    gtin: ld?.gtin ?? meta.product.gtin,
    gtinOk: ld?.gtin ? ld.gtinOk : meta.product.gtinOk,
    category: ld?.category,
    sources: [...new Set(sources)],
  }
  if (product.price === undefined) {
    const guess = textPrice(text)
    if (guess !== undefined) {
      product.price = guess
      product.currency = 'EUR'
      product.priceGuess = true
      product.sources = [...product.sources, 'Seitentext']
    }
  }
  const fb = imageFallback(text)
  if (!product.image && fb.url) {
    product.image = absolute(fb.url, pageUrl)
    if (product.image) {
      product.imageGuess = true
      product.sources = [...product.sources, 'Seitenbild']
    }
  }
  return { product, diag: { ldBlocks: blocks.length, productNode: !!ld, metaTags: meta.count, imgTags: fb.imgTags } }
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
  const empty = { ...base, ldBlocks: 0, productNode: false, metaTags: 0, imgTags: 0 }
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

/** Suchseiten für den Preisvergleich im Browser. Die App liest diese Seiten nie, sie öffnet nur die Suche. */
export function priceSearches(name: string): { id: string; label: string; url: string }[] {
  const q = encodeURIComponent(name.replace(/\s+/g, ' ').trim().slice(0, 100))
  if (!q) return []
  return [
    { id: 'idealo', label: 'Idealo', url: `https://www.idealo.de/preisvergleich/MainSearchProductCategory.html?q=${q}` },
    { id: 'google', label: 'Google Shopping', url: `https://www.google.com/search?tbm=shop&q=${q}` },
    { id: 'geizhals', label: 'Geizhals', url: `https://geizhals.de/?fs=${q}` },
  ]
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

/** Zusatz hinter der Meldung: Statuscode oder Grund des Netzfehlers. */
export function linkFailExtra(e: unknown): { status?: number; why?: string } {
  if (!(e instanceof LinkError)) return {}
  if (e.status) return { status: e.status }
  const why = e.kind === 'network' ? netReason(e.detail) : ''
  return why ? { why } : {}
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

export type FieldKey = 'name' | 'price' | 'image'
export type FieldState = 'ok' | 'guess' | 'none' | 'off' | 'kept'

export interface FieldReport {
  key: FieldKey
  state: FieldState
  text?: string
  why?: string
  /** Name der Seite, der angeboten wird, wenn der eigene Name bleibt. */
  alt?: string
}

const hostOf = (url: string): string => {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return ''
  }
}

/** Warum ein Feld fehlt, in einem Satz (deutsch, wird mit t() angezeigt). */
export function missingWhy(key: FieldKey, p: Product, d: Diagnostics | undefined, url: string): string {
  const host = hostOf(url)
  if (key === 'price') {
    if (/(^|\.)(amazon|amzn)\./.test(host)) return 'Amazon gibt Preise nicht an Apps heraus.'
    if (d?.productNode) return 'Die Produktdaten der Seite enthalten keinen Preis.'
    return 'Die Seite nennt den Preis nicht in lesbarer Form, oft wird er erst per JavaScript geladen.'
  }
  if (key === 'image') {
    if (p.image !== undefined) return 'Das Bild ließ sich nicht laden.'
    if (d && d.imgTags === 0) return 'Die Seite zeigt der App keine Bilder, manche Shops liefern Apps eine abgespeckte Seite.'
    return 'Die App hat auf der Seite kein passendes Produktbild gefunden.'
  }
  return 'Die Seite nennt keinen Produktnamen.'
}

/** Text zum Kopieren: was die App gelesen hat, für die Fehlersuche im Chat. */
export function describeResult(url: string, d: Diagnostics | undefined, p: Product | null, err: string): string {
  return [
    `Adresse: ${url}`,
    d ? `Endadresse: ${d.finalUrl}` : '',
    d ? `HTTP ${d.status}, ${d.bytes} Zeichen, ${d.type || 'ohne Typ'}` : '',
    d ? `JSON-LD-Blöcke: ${d.ldBlocks}, Produktknoten: ${d.productNode ? 'ja' : 'nein'}, Meta-Tags: ${d.metaTags}, Bild-Tags: ${d.imgTags}` : '',
    p ? `Quellen: ${p.sources.join(', ') || '-'}` : '',
    p ? `Name: ${p.name ?? '-'} | Marke: ${p.brand ?? '-'} | Preis: ${p.price ?? '-'}${p.priceGuess ? ' (geraten)' : ''} ${p.currency ?? ''} | EAN: ${p.gtin ?? '-'}${p.gtinOk === false ? ' (Prüfziffer falsch)' : ''} | Bild: ${p.image ? (p.imageGuess ? 'ja (geraten)' : 'ja') : 'nein'} | Kategorie: ${p.category ?? '-'}` : '',
    err ? `Fehler: ${err}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

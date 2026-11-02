import { loadImages, packZip, unpackZip, type Packable } from './backup'
import { listTitle } from './lists'
import type { TFn } from './i18n'
import type { Item, ReceivedCollection, ReceivedItem, ReceivedList, ShareBought, Wishlist } from './types'

export const SHARE_FORMAT = 1
export const SHARE_MARKER = 'wunschliste-teilen'
/** Eigene Endung, damit WhatsApp und Android die Datei nicht als ZIP-Archiv zum Entpacken öffnen. Der Inhalt bleibt eine ZIP. */
export const SHARE_EXT = 'wunsch'
const MAX_LISTS = 100
const MAX_ITEMS = 5000
const MAX_IMAGE_BYTES = 6 * 1024 * 1024

export interface ShareOptions {
  listIds: string[]
  name: string
  shareId: string
  hue: number
  notes: boolean
  price: boolean
  images: boolean
  listDate: boolean
  bought: ShareBought
}

export const DEFAULT_SHARE: Omit<ShareOptions, 'listIds' | 'name' | 'shareId' | 'hue'> = {
  notes: false,
  price: true,
  images: true,
  listDate: true,
  bought: 'hidden',
}

export interface ShareCounts {
  lists: number
  visible: number
  owned: number
  images: number
}

const pad = (n: number) => String(n).padStart(2, '0')

export function shareFileName(name: string, at = new Date()): string {
  const slug = name.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'liste'
  return `wunschliste-von-${slug}-${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}.${SHARE_EXT}`
}

interface Source {
  items: Item[]
  lists: Wishlist[]
}

/** Wählt aus, was beim Teilen mitgeht. Geschenkideen für andere sind nie dabei. */
export function pickShared(src: Source, o: ShareOptions, t: TFn) {
  const chosen = src.lists.filter((l) => l.owner === 'me' && o.listIds.includes(l.id))
  const collections: ReceivedCollection[] = []
  let visible = 0
  let owned = 0
  for (const l of chosen) {
    const mine = src.items.filter((i) => i.owner === 'me' && !i.deletedAt && i.listId === l.id)
    const items: ReceivedItem[] = []
    for (const i of mine) {
      if (!i.bought && o.bought === 'only') continue
      if (i.bought && o.bought === 'exclude') continue
      const isOwned = i.bought
      const it: ReceivedItem = { id: i.id, name: i.name, emoji: i.emoji, hue: i.hue, owned: isOwned }
      if (i.kind) it.kind = i.kind
      if (i.link) it.link = i.link
      if (o.price && i.price !== undefined) it.price = i.price
      if (isOwned) {
        if (i.boughtAt) it.boughtAt = i.boughtAt
      } else {
        if (o.notes && i.note) it.note = i.note
        if (o.images && i.imageId) it.imageId = i.imageId
      }
      items.push(it)
      if (isOwned) owned++
      else visible++
    }
    if (!items.length) continue
    const c: ReceivedCollection = { id: l.id, name: listTitle(l, t), emoji: l.emoji, hue: l.hue, items }
    if (o.listDate && l.date) c.date = l.date
    collections.push(c)
  }
  return { collections, visible, owned }
}

export async function buildShare(src: Source, o: ShareOptions, t: TFn, appVersion: string, now = Date.now()): Promise<{ bytes: Uint8Array; name: string; counts: ShareCounts }> {
  const { collections, visible, owned } = pickShared(src, o, t)
  const ids = [...new Set(collections.flatMap((c) => c.items.flatMap((i) => (i.imageId ? [i.imageId] : []))))]
  const images = await loadImages(ids)
  for (const c of collections) for (const i of c.items) if (i.imageId && !images.has(i.imageId)) delete i.imageId
  const doc = { app: SHARE_MARKER, format: SHARE_FORMAT, createdAt: now, appVersion, from: o.name.trim(), hue: o.hue, shareId: o.shareId, lists: collections }
  return {
    bytes: packZip(doc, images),
    name: shareFileName(o.name, new Date(now)),
    counts: { lists: collections.length, visible, owned, images: images.size },
  }
}

export type ShareRead =
  | { ok: true; from: string; hue: number; shareId: string; createdAt: number; lists: ReceivedCollection[]; images: Packable; counts: ShareCounts }
  | { ok: false; reason: 'notZip' | 'notShare' | 'isBackup' | 'newerFormat' | 'broken' }

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown, max: number): string | undefined => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined)
const num = (v: unknown, min: number, max: number): number | undefined => (typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : undefined)
const imageIdOk = (v: unknown): v is string => typeof v === 'string' && /^img-[A-Za-z0-9_-]{4,64}$/.test(v)
const dateOk = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)

/** Nur normale Webadressen, keine Schemata wie "javascript:". */
function linkOk(v: unknown): string | undefined {
  const s = str(v, 2000)
  if (!s) return undefined
  if (/^[a-z][a-z0-9+.-]*:/i.test(s) && !/^https?:\/\//i.test(s)) return undefined
  return s
}

/** Liest eine empfangene Datei streng: prüft Prüfsummen, bereinigt alle Felder und begrenzt Mengen. */
export function readShare(bytes: Uint8Array): ShareRead {
  const u = unpackZip(bytes)
  if (!u.ok) return { ok: false, reason: u.reason === 'notZip' ? 'notZip' : u.reason === 'broken' ? 'broken' : 'notShare' }
  const { doc } = u
  if (doc.app === 'wunschliste-backup') return { ok: false, reason: 'isBackup' }
  if (doc.app !== SHARE_MARKER || !Array.isArray(doc.lists)) return { ok: false, reason: 'notShare' }
  if (typeof doc.format !== 'number' || doc.format > SHARE_FORMAT) return { ok: false, reason: 'newerFormat' }
  const from = str(doc.from, 60)
  const shareId = str(doc.shareId, 64)
  if (!from || !shareId || doc.lists.length > MAX_LISTS) return { ok: false, reason: 'broken' }

  const lists: ReceivedCollection[] = []
  const used = new Set<string>()
  let total = 0
  let visible = 0
  let owned = 0
  for (const raw of doc.lists) {
    if (!isObj(raw) || !Array.isArray(raw.items)) return { ok: false, reason: 'broken' }
    const id = str(raw.id, 64)
    const name = str(raw.name, 80)
    if (!id || !name) return { ok: false, reason: 'broken' }
    const items: ReceivedItem[] = []
    for (const r of raw.items) {
      if (!isObj(r) || ++total > MAX_ITEMS) return { ok: false, reason: 'broken' }
      const iid = str(r.id, 64)
      const iname = str(r.name, 200)
      if (!iid || !iname) return { ok: false, reason: 'broken' }
      const it: ReceivedItem = { id: iid, name: iname, emoji: str(r.emoji, 8) ?? '🎁', hue: num(r.hue, 0, 360) ?? 200, owned: r.owned === true }
      const kind = str(r.kind, 80)
      const link = linkOk(r.link)
      const price = num(r.price, 0, 10_000_000)
      const note = str(r.note, 2000)
      if (kind) it.kind = kind
      if (link) it.link = link
      if (price !== undefined) it.price = price
      if (note && !it.owned) it.note = note
      const bat = num(r.boughtAt, 1, 4_102_444_800_000)
      if (it.owned && bat) it.boughtAt = bat
      if (!it.owned && imageIdOk(r.imageId) && u.images.has(r.imageId) && u.images.get(r.imageId)!.data.byteLength <= MAX_IMAGE_BYTES) {
        it.imageId = r.imageId
        used.add(r.imageId)
      }
      items.push(it)
      if (it.owned) owned++
      else visible++
    }
    const c: ReceivedCollection = { id, name, emoji: str(raw.emoji, 8) ?? '⭐', hue: num(raw.hue, 0, 360) ?? 200, items }
    if (dateOk(raw.date)) c.date = raw.date
    lists.push(c)
  }
  const images: Packable = new Map([...u.images].filter(([id]) => used.has(id)))
  return {
    ok: true,
    from,
    hue: num(doc.hue, 0, 360) ?? 200,
    shareId,
    createdAt: num(doc.createdAt, 1, 4_102_444_800_000) ?? Date.now(),
    lists,
    images,
    counts: { lists: lists.length, visible, owned, images: images.size },
  }
}

export interface MergeResult {
  pkg: ReceivedList
  /** Namen der Listen, die eine vorhandene ersetzt haben. */
  replaced: string[]
  added: string[]
  isNew: boolean
}

/** Fügt ein empfangenes Paket ein. Gleicher Absender: gleiche Listen werden ersetzt, andere Listen des Absenders bleiben. */
export function mergeReceived(existing: ReceivedList[], r: Extract<ShareRead, { ok: true }>, personIdByName: (name: string) => string | undefined, now = Date.now()): MergeResult {
  const id = `r-${r.shareId}`
  const old = existing.find((x) => x.id === id || x.shareId === r.shareId)
  const replaced: string[] = []
  const added: string[] = []
  let lists: ReceivedCollection[] = old ? [...old.lists] : []
  for (const c of r.lists) {
    const at = lists.findIndex((x) => x.id === c.id)
    if (at >= 0) {
      lists[at] = c
      replaced.push(c.name)
    } else {
      lists = [...lists, c]
      added.push(c.name)
    }
  }
  const pkg: ReceivedList = {
    id: old?.id ?? id,
    from: r.from,
    hue: r.hue,
    receivedAt: now,
    shareId: r.shareId,
    personId: old?.personId ?? personIdByName(r.from),
    lists,
  }
  return { pkg, replaced, added, isNew: !old }
}

const sizeCache = new Map<string, number>()

/** Grobe Dateigröße in Bytes: Bilder (gemerkt) plus etwas Text. */
export async function estimateBytes(src: Source, o: ShareOptions, t: TFn): Promise<number> {
  const { collections } = pickShared(src, o, t)
  let n = 2000
  for (const c of collections) for (const i of c.items) {
    n += 260 + (i.name.length + (i.note?.length ?? 0) + (i.link?.length ?? 0)) * 1.1
    if (!i.imageId) continue
    let sz = sizeCache.get(i.imageId)
    if (sz === undefined) {
      const rec = (await loadImages([i.imageId])).get(i.imageId)
      sz = rec?.data.byteLength ?? 0
      sizeCache.set(i.imageId, sz)
    }
    n += sz
  }
  return n
}

export type { ShareBought }

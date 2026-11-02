import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate'
import { BACKUPS, IMAGES, dbDelete, dbGet, dbKeys, dbPutMany } from './db'
import { usedImageIds, type StoredImage } from './images'
import { migrate, sanitize, repair, type Raw, type StoredData } from './storage'
import { SCHEMA_VERSION } from './types'

/** Version der Backup-Datei selbst (nicht des Datenformats). */
export const BACKUP_FORMAT = 1
const MARKER = 'wunschliste-backup'
const DATA_FILE = 'daten.json'
const SUM_FILE = 'pruefsummen.json'
const IMG_DIR = 'bilder/'
export const SAFETY_KEEP = 3

export interface BackupCounts {
  items: number
  lists: number
  persons: number
  received: number
  images: number
}

export interface BackupMeta {
  createdAt: number
  appVersion: string
  schemaVersion: number
  counts: BackupCounts
}

export type BackupData = Pick<StoredData, 'items' | 'lists' | 'persons' | 'received'>

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

/** CRC32 als achtstelliger Hex-Wert. Schützt vor stillen Bitfehlern, die das ZIP-Format selbst nicht meldet. */
export function crc32(data: Uint8Array): string {
  let c = 0xffffffff
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8)
  return ((c ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0')
}

export type Packable = Map<string, StoredImage>

/** Packt ein Dokument (daten.json) und Bilder in eine ZIP mit Prüfsummen. */
export function packZip(doc: object, images: Packable): Uint8Array {
  const files: Record<string, Uint8Array | [Uint8Array, { level: 0 | 6 }]> = {}
  for (const [id, rec] of images) files[`${IMG_DIR}${id}.${extOf(rec.type)}`] = [new Uint8Array(rec.data), { level: 0 }]
  const json = strToU8(JSON.stringify(doc))
  files[DATA_FILE] = [json, { level: 6 }]
  const sums: Record<string, string> = { [DATA_FILE]: crc32(json) }
  for (const [path, v] of Object.entries(files)) if (path !== DATA_FILE) sums[path] = crc32(Array.isArray(v) ? v[0] : v)
  files[SUM_FILE] = [strToU8(JSON.stringify(sums)), { level: 6 }]
  return zipSync(files)
}

export type Unpacked = { ok: true; doc: Raw; images: Packable } | { ok: false; reason: 'notZip' | 'notBackup' | 'broken' }

/** Entpackt und prüft eine ZIP von packZip: Format, Prüfsummen, lesbares JSON. Welche App-Kennung drinsteht, prüft der Aufrufer. */
export function unpackZip(bytes: Uint8Array): Unpacked {
  let files: Record<string, Uint8Array>
  try {
    files = unzipSync(bytes)
  } catch {
    return { ok: false, reason: 'notZip' }
  }
  const raw = files[DATA_FILE]
  if (!raw) return { ok: false, reason: 'notBackup' }
  try {
    const sums = JSON.parse(strFromU8(files[SUM_FILE] ?? strToU8('{}'))) as Record<string, string>
    const paths = Object.keys(files).filter((p) => p !== SUM_FILE && !p.endsWith('/'))
    if (!sums[DATA_FILE] || paths.some((p) => sums[p] !== crc32(files[p]))) return { ok: false, reason: 'broken' }
  } catch {
    return { ok: false, reason: 'broken' }
  }
  let doc: Raw
  try {
    doc = JSON.parse(strFromU8(raw)) as Raw
  } catch {
    return { ok: false, reason: 'broken' }
  }
  if (typeof doc !== 'object' || doc === null) return { ok: false, reason: 'notBackup' }
  const images: Packable = new Map()
  for (const [path, content] of Object.entries(files)) {
    if (!path.startsWith(IMG_DIR)) continue
    const file = path.slice(IMG_DIR.length)
    const dot = file.lastIndexOf('.')
    if (dot < 1) continue
    const buf = content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength) as ArrayBuffer
    images.set(file.slice(0, dot), { type: typeOf(file), data: buf, createdAt: Number(doc.createdAt) || Date.now() })
  }
  return { ok: true, doc, images }
}

export async function loadImages(ids: string[]): Promise<Packable> {
  const out: Packable = new Map()
  for (const id of ids) {
    const rec = await dbGet<StoredImage>(id, IMAGES)
    if (rec) out.set(id, rec)
  }
  return out
}

const pad = (n: number) => String(n).padStart(2, '0')

export function backupName(kind: 'manual' | 'auto', at = new Date()): string {
  const day = `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`
  return kind === 'auto' ? `wunschliste-auto-${day}.zip` : `wunschliste-backup-${day}-${pad(at.getHours())}${pad(at.getMinutes())}.zip`
}

export const imageIdsOf = (d: Pick<BackupData, 'items' | 'received'>): string[] => usedImageIds(d)

const extOf = (type: string) => (type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg')
const typeOf = (name: string) => (name.endsWith('.png') ? 'image/png' : name.endsWith('.webp') ? 'image/webp' : 'image/jpeg')

/** Baut die ZIP-Datei: daten.json plus alle verwendeten Bilder als eigene Dateien. */
export async function buildBackup(data: BackupData, appVersion: string, now = Date.now(), settings?: object): Promise<{ bytes: Uint8Array; meta: BackupMeta }> {
  const images = await loadImages(imageIdsOf(data))
  const meta: BackupMeta = {
    createdAt: now,
    appVersion,
    schemaVersion: SCHEMA_VERSION,
    counts: { items: data.items.length, lists: data.lists.length, persons: data.persons.length, received: data.received.length, images: images.size },
  }
  return { bytes: packZip({ app: MARKER, format: BACKUP_FORMAT, ...meta, data, ...(settings ? { settings } : {}) }, images), meta }
}

export type ReadResult =
  | { ok: true; data: StoredData; meta: BackupMeta; images: Map<string, StoredImage>; missingImages: number; migratedFrom?: number; settings?: object }
  | { ok: false; reason: 'notZip' | 'notBackup' | 'newerFormat' | 'newerData' | 'broken'; version?: number }

/** Liest eine Backup-Datei und prüft sie, ohne etwas zu verändern. */
export function readBackup(bytes: Uint8Array): ReadResult {
  const u = unpackZip(bytes)
  if (!u.ok) return { ok: false, reason: u.reason }
  const { doc, images } = u
  if (doc.app !== MARKER || typeof doc.data !== 'object' || doc.data === null) return { ok: false, reason: 'notBackup' }
  if (typeof doc.format !== 'number' || doc.format > BACKUP_FORMAT) return { ok: false, reason: 'newerFormat', version: Number(doc.format) }
  const version = Number(doc.schemaVersion)
  if (!Number.isInteger(version) || version < 1) return { ok: false, reason: 'broken' }
  if (version > SCHEMA_VERSION) return { ok: false, reason: 'newerData', version }

  let body = doc.data as Raw
  if (version < SCHEMA_VERSION) {
    const m = migrate(body, version)
    if (!m) return { ok: false, reason: 'broken' }
    body = m
  }
  const clean = sanitize(body)
  if (!clean) return { ok: false, reason: 'broken' }
  const data = repair({ ...clean, lastBackupAt: null, changedSinceBackup: false })

  const missingImages = imageIdsOf(data).filter((id) => !images.has(id)).length
  const c = (doc.counts ?? {}) as Partial<BackupCounts>
  const meta: BackupMeta = {
    createdAt: Number(doc.createdAt) || Date.now(),
    appVersion: String(doc.appVersion ?? ''),
    schemaVersion: version,
    counts: {
      items: data.items.length,
      lists: data.lists.length,
      persons: data.persons.length,
      received: data.received.length,
      images: Number(c.images ?? images.size),
    },
  }
  const settings = typeof doc.settings === 'object' && doc.settings !== null && !Array.isArray(doc.settings) ? (doc.settings as object) : undefined
  return { ok: true, data, meta, images, missingImages, migratedFrom: version < SCHEMA_VERSION ? version : undefined, settings }
}

/** Schreibt die Bilder des Backups in den Bilderspeicher. Danach kann der Datenstand ersetzt werden. */
export async function restoreImages(images: Map<string, StoredImage>): Promise<void> {
  await dbPutMany([...images.entries()], IMAGES)
}

export interface SafetyCopy {
  id: string
  at: number
  reason: string
  counts: BackupCounts
  bytes: Uint8Array
}

/** Interne Sicherheitskopie, z. B. direkt vor dem Wiederherstellen. Es bleiben die letzten SAFETY_KEEP. */
export async function saveSafetyCopy(bytes: Uint8Array, meta: BackupMeta, reason: string): Promise<void> {
  const id = `safety-${String(meta.createdAt).padStart(14, '0')}`
  const rec: SafetyCopy = { id, at: meta.createdAt, reason, counts: meta.counts, bytes }
  await dbPutMany([[id, rec]], BACKUPS)
  const keys = (await dbKeys(BACKUPS)).filter((k) => k.startsWith('safety-')).sort()
  await dbDelete(keys.slice(0, Math.max(0, keys.length - SAFETY_KEEP)), BACKUPS)
}

export async function listSafetyCopies(): Promise<Omit<SafetyCopy, 'bytes'>[]> {
  const keys = (await dbKeys(BACKUPS)).filter((k) => k.startsWith('safety-')).sort().reverse()
  const out: Omit<SafetyCopy, 'bytes'>[] = []
  for (const k of keys) {
    const rec = await dbGet<SafetyCopy>(k, BACKUPS)
    if (rec) out.push({ id: rec.id, at: rec.at, reason: rec.reason, counts: rec.counts })
  }
  return out
}

export async function loadSafetyCopy(id: string): Promise<Uint8Array | null> {
  return (await dbGet<SafetyCopy>(id, BACKUPS))?.bytes ?? null
}

export async function clearSafetyCopies(): Promise<void> {
  await dbDelete(await dbKeys(BACKUPS), BACKUPS)
}

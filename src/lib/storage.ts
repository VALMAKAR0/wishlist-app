import { dbGet, dbPutMany, dbSet, requestPersist } from './db'
import { defaultList } from './demoData'
import { uid } from './format'
import { SCHEMA_VERSION, type Item, type Person, type ReceivedList, type Wishlist } from './types'

export interface StoredData {
  items: Item[]
  lists: Wishlist[]
  persons: Person[]
  received: ReceivedList[]
  lastBackupAt: number | null
  changedSinceBackup: boolean
}

export type Loaded =
  | { kind: 'fresh' }
  | { kind: 'ok'; data: StoredData; migratedFrom?: number }
  | { kind: 'newer'; version: number }
  | { kind: 'unreadable' }
  | { kind: 'unavailable' }

export type Raw = Record<string, unknown>
type Migration = (d: Raw) => Raw

/** Schritte von Version n auf n+1. Künftige Formatänderungen kommen hier rein, alte Daten laufen dann Schritt für Schritt durch. */
export const MIGRATIONS: Record<number, Migration> = {}

const KEY = 'data'
const KEY_BROKEN = 'data.broken'
const LOAD_TIMEOUT_MS = 5000

const isObj = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v)

const versionOf = (raw: unknown): number | null =>
  isObj(raw) && Number.isInteger(raw.schemaVersion) && (raw.schemaVersion as number) >= 1 ? (raw.schemaVersion as number) : null

export function migrate(raw: Raw, from: number, steps: Record<number, Migration> = MIGRATIONS, to = SCHEMA_VERSION): Raw | null {
  let d = raw
  for (let v = from; v < to; v++) {
    const step = steps[v]
    if (!step) return null
    try {
      d = { ...step(d), schemaVersion: v + 1 }
    } catch {
      return null
    }
  }
  return d
}

export function sanitize(d: Raw): StoredData | null {
  const { items, lists, persons, received } = d
  if (!Array.isArray(items) || !Array.isArray(lists) || !Array.isArray(persons) || !Array.isArray(received)) return null
  const all: unknown[] = [...items, ...lists, ...persons, ...received]
  if (!all.every((x) => isObj(x) && typeof x.id === 'string')) return null
  return {
    items: items as Item[],
    lists: lists as Wishlist[],
    persons: persons as Person[],
    received: received as ReceivedList[],
    lastBackupAt: typeof d.lastBackupAt === 'number' ? d.lastBackupAt : null,
    changedSinceBackup: d.changedSinceBackup === true,
  }
}

/** Jeder Eigentümer hat mindestens eine Liste, jeder Eintrag gehört zu einer vorhandenen Liste. */
export function repair(d: StoredData): StoredData {
  const lists = [...d.lists]
  for (const owner of ['me', ...d.persons.map((p) => p.id)]) {
    if (!lists.some((l) => l.owner === owner)) lists.push(defaultList(owner, `l-${owner}-${uid()}`))
  }
  const ids = new Set(lists.map((l) => l.id))
  const items = d.items.map((i) => (ids.has(i.listId) ? i : { ...i, listId: lists.find((l) => l.owner === i.owner)?.id ?? i.listId }))
  return { ...d, lists, items }
}

const withTimeout = <T>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('Zeitüberschreitung')), ms))])

async function setAside(raw: unknown): Promise<Loaded> {
  try {
    await dbSet(KEY_BROKEN, raw)
    return { kind: 'unreadable' }
  } catch {
    return { kind: 'unavailable' }
  }
}

export async function loadData(): Promise<Loaded> {
  let raw: unknown
  try {
    raw = await withTimeout(dbGet<unknown>(KEY), LOAD_TIMEOUT_MS)
  } catch {
    return { kind: 'unavailable' }
  }

  if (raw === undefined) {
    void requestPersist()
    return { kind: 'fresh' }
  }

  const version = versionOf(raw)
  if (version === null) return setAside(raw)
  if (version > SCHEMA_VERSION) return { kind: 'newer', version }

  let doc = raw as Raw
  if (version < SCHEMA_VERSION) {
    const migrated = migrate(doc, version)
    if (!migrated) return setAside(raw)
    doc = migrated
  }

  const data = sanitize(doc)
  if (!data) return setAside(raw)
  const fixed = repair(data)

  if (version < SCHEMA_VERSION) {
    try {
      await dbPutMany([
        [`data.v${version}`, raw],
        [KEY, { ...fixed, schemaVersion: SCHEMA_VERSION, savedAt: Date.now() }],
      ])
    } catch {
      return { kind: 'unavailable' }
    }
    return { kind: 'ok', data: fixed, migratedFrom: version }
  }
  return { kind: 'ok', data: fixed }
}

let pending: StoredData | null = null
let running: Promise<boolean> | null = null

async function flush(): Promise<boolean> {
  try {
    while (pending) {
      const d = pending
      pending = null
      await dbSet(KEY, { ...d, schemaVersion: SCHEMA_VERSION, savedAt: Date.now() })
    }
    return true
  } catch {
    return false
  } finally {
    running = null
  }
}

/** Schnell aufeinanderfolgende Änderungen werden zusammengefasst, geschrieben wird immer der neueste Stand. */
export function saveData(d: StoredData): Promise<boolean> {
  pending = d
  running ??= flush()
  return running
}

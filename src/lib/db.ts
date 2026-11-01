// IndexedDB ohne Zusatzbibliothek. Speicher "kv" = Datenstand, "images" = Bilder, "backups" = interne Sicherheitskopien.

const DB_NAME = 'wishlist'
const DB_VERSION = 3
export const KV = 'kv'
export const IMAGES = 'images'
export const BACKUPS = 'backups'
const STORES = [KV, IMAGES, BACKUPS]

let opening: Promise<IDBDatabase> | null = null

function open(): Promise<IDBDatabase> {
  opening ??= new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB fehlt'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      for (const name of STORES) if (!req.result.objectStoreNames.contains(name)) req.result.createObjectStore(name)
    }
    req.onsuccess = () => {
      const db = req.result
      db.onversionchange = () => db.close()
      db.onclose = () => {
        opening = null
      }
      resolve(db)
    }
    req.onerror = () => reject(req.error ?? new Error('IndexedDB-Fehler'))
    req.onblocked = () => reject(new Error('IndexedDB blockiert'))
  }).catch((e) => {
    opening = null
    throw e
  })
  return opening
}

export async function dbGet<T>(key: string, store = KV): Promise<T | undefined> {
  const db = await open()
  return new Promise<T | undefined>((resolve, reject) => {
    const req = db.transaction(store, 'readonly').objectStore(store).get(key)
    req.onsuccess = () => resolve(req.result as T | undefined)
    req.onerror = () => reject(req.error)
  })
}

export async function dbKeys(store = KV): Promise<string[]> {
  const db = await open()
  return new Promise<string[]>((resolve, reject) => {
    const req = db.transaction(store, 'readonly').objectStore(store).getAllKeys()
    req.onsuccess = () => resolve(req.result.map(String))
    req.onerror = () => reject(req.error)
  })
}

/** Schreibt mehrere Einträge in einer Transaktion. Fertig erst, wenn alles sicher abgeschlossen ist. */
export async function dbPutMany(entries: [string, unknown][], store = KV): Promise<void> {
  const db = await open()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    const os = tx.objectStore(store)
    for (const [k, v] of entries) os.put(v, k)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error ?? new Error('Speichern abgebrochen'))
  })
}

export const dbSet = (key: string, value: unknown, store = KV) => dbPutMany([[key, value]], store)

export async function dbDelete(keys: string[], store = KV): Promise<void> {
  if (!keys.length) return
  const db = await open()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    const os = tx.objectStore(store)
    for (const k of keys) os.delete(k)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error ?? new Error('Löschen abgebrochen'))
  })
}

/** Bittet das System, den Speicher nicht von selbst aufzuräumen. Die Antwort ist nur eine Anfrage-Antwort, kein Versprechen. */
export async function requestPersist(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false
  } catch {
    return false
  }
}

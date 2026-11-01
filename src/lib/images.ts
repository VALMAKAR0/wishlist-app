import { useEffect, useState } from 'react'
import { dbDelete, dbGet, dbKeys, dbSet, IMAGES } from './db'
import { uid } from './format'
import type { Item, ReceivedList } from './types'

export const IMAGE_MAX = 800
const IMAGE_QUALITY = 0.82

/** Gespeichert wird als Rohdaten statt als Blob, das ist auf iOS am zuverlässigsten. */
export interface StoredImage {
  type: string
  data: ArrayBuffer
  createdAt: number
}

async function decode(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; done: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const b = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return { source: b, width: b.width, height: b.height, done: () => b.close() }
    } catch {
      /* weiter mit dem Bild-Element */
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, done: () => URL.revokeObjectURL(url) }
  } catch (e) {
    URL.revokeObjectURL(url)
    throw e
  }
}

/** Verkleinert auf höchstens IMAGE_MAX Pixel an der längsten Kante und speichert als JPEG. */
export async function processImage(file: Blob): Promise<{ type: string; data: ArrayBuffer }> {
  const src = await decode(file)
  try {
    if (!src.width || !src.height) throw new Error('Leeres Bild')
    const scale = Math.min(1, IMAGE_MAX / Math.max(src.width, src.height))
    const w = Math.max(1, Math.round(src.width * scale))
    const h = Math.max(1, Math.round(src.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Kein Canvas')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, w, h)
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(src.source, 0, 0, w, h)
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', IMAGE_QUALITY))
    if (!blob) throw new Error('Umwandeln fehlgeschlagen')
    return { type: 'image/jpeg', data: await blob.arrayBuffer() }
  } finally {
    src.done()
  }
}

export async function saveImage(img: { type: string; data: ArrayBuffer }): Promise<string> {
  const id = `img-${Date.now().toString(36)}${uid()}`
  const rec: StoredImage = { ...img, createdAt: Date.now() }
  await dbSet(id, rec, IMAGES)
  return id
}

const urls = new Map<string, Promise<string | null>>()
const resolved = new Map<string, string>()

/** Lädt ein Bild einmal pro Start und merkt sich die Adresse. Bilder ändern sich nie, eine neue Auswahl bekommt eine neue ID. */
export function imageUrl(id: string): Promise<string | null> {
  let p = urls.get(id)
  if (!p) {
    p = dbGet<StoredImage>(id, IMAGES)
      .then((rec) => {
        if (!rec) return null
        const u = URL.createObjectURL(new Blob([rec.data], { type: rec.type }))
        resolved.set(id, u)
        return u
      })
      .catch(() => null)
    urls.set(id, p)
  }
  return p
}

export function useImageUrl(id?: string): string | null {
  const [got, setGot] = useState<{ id: string; url: string | null } | null>(null)
  useEffect(() => {
    if (!id) return
    let off = false
    void imageUrl(id).then((u) => {
      if (!off) setGot({ id, url: u })
    })
    return () => {
      off = true
    }
  }, [id])
  if (!id) return null
  return resolved.get(id) ?? (got?.id === id ? got.url : null)
}

/** Löscht Bilder, auf die kein Eintrag mehr zeigt. Läuft nur direkt nach dem Laden, wenn nichts mehr in Arbeit ist. */
export async function gcImages(referenced: Set<string>): Promise<number> {
  try {
    const stale = (await dbKeys(IMAGES)).filter((k) => !referenced.has(k))
    await dbDelete(stale, IMAGES)
    return stale.length
  } catch {
    return 0
  }
}

/** Alle Bild-IDs, auf die Einträge oder erhaltene Listen zeigen. */
export function usedImageIds(d: { items: Pick<Item, 'imageId'>[]; received: Pick<ReceivedList, 'lists'>[] }): string[] {
  const ids = new Set<string>()
  for (const i of d.items) if (i.imageId) ids.add(i.imageId)
  for (const r of d.received) for (const l of r.lists) for (const x of l.items) if (x.imageId) ids.add(x.imageId)
  return [...ids]
}

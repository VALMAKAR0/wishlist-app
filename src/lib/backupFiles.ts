import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

export const isNative = () => Capacitor.isNativePlatform()

/** Ordner in "Dokumente" (nur Android-App). */
export const BACKUP_DIR = 'Wunschliste'
export const AUTO_KEEP = 5
const AUTO_PREFIX = 'wunschliste-auto-'

export type Delivered = { where: 'documents' | 'shared' | 'download' } | { where: 'cancelled' }

function toBase64(bytes: Uint8Array): string {
  let s = ''
  const step = 0x8000
  for (let i = 0; i < bytes.length; i += step) s += String.fromCharCode(...bytes.subarray(i, i + step))
  return btoa(s)
}

async function ensurePermission() {
  try {
    await Filesystem.requestPermissions()
  } catch {
    /* ab Android 11 nicht nötig */
  }
}

async function writeToDocuments(bytes: Uint8Array, name: string) {
  await ensurePermission()
  await Filesystem.writeFile({ path: `${BACKUP_DIR}/${name}`, data: toBase64(bytes), directory: Directory.Documents, recursive: true })
}

/** Behält die letzten AUTO_KEEP automatischen Sicherungen, ältere eigene Dateien werden gelöscht. */
async function pruneAuto() {
  try {
    const { files } = await Filesystem.readdir({ path: BACKUP_DIR, directory: Directory.Documents })
    const mine = files.map((f) => f.name).filter((n) => n.startsWith(AUTO_PREFIX) && n.endsWith('.zip')).sort()
    for (const n of mine.slice(0, Math.max(0, mine.length - AUTO_KEEP))) {
      await Filesystem.deleteFile({ path: `${BACKUP_DIR}/${n}`, directory: Directory.Documents }).catch(() => undefined)
    }
  } catch {
    /* Aufräumen ist nur Zugabe */
  }
}

/** Automatische Sicherung in Dokumente. Wirft bei Fehlern, damit der Aufrufer nichts als gesichert markiert. */
export async function writeAutoBackup(bytes: Uint8Array, name: string): Promise<void> {
  await writeToDocuments(bytes, name)
  await pruneAuto()
}

async function shareNative(bytes: Uint8Array, name: string): Promise<Delivered> {
  const w = await Filesystem.writeFile({ path: name, data: toBase64(bytes), directory: Directory.Cache })
  try {
    await Share.share({ title: name, files: [w.uri] })
    return { where: 'shared' }
  } catch (e) {
    if (/cancel/i.test(String((e as Error)?.message ?? e))) return { where: 'cancelled' }
    throw e
  }
}

const touch = () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches

/** Gibt die Sicherung aus: Android in Dokumente (sonst Teilen-Menü), iPhone/Handy über das Teilen-Menü, Rechner als Download. */
export async function deliverBackup(bytes: Uint8Array, name: string): Promise<Delivered> {
  if (isNative()) {
    try {
      await writeToDocuments(bytes, name)
      return { where: 'documents' }
    } catch {
      return shareNative(bytes, name)
    }
  }
  const file = new File([bytes as BlobPart], name, { type: 'application/zip' })
  if (touch() && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name })
      return { where: 'shared' }
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return { where: 'cancelled' }
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return { where: 'download' }
}

import { Clipboard } from '@capacitor/clipboard'
import { isNative } from './backupFiles'

/** Liest die Zwischenablage; in der Android-App über das native Plugin, sonst über den Browser. */
export async function readClipboard(): Promise<string> {
  if (isNative()) {
    const r = await Clipboard.read()
    return typeof r.value === 'string' ? r.value : ''
  }
  return navigator.clipboard.readText()
}

/** Alle Web-Adressen im Text, in der Reihenfolge ihres Auftretens. */
export function allUrls(text: string): string[] {
  const out: string[] = []
  for (const m of text.matchAll(/https?:\/\/[^\s<>"'„“”]+/gi)) out.push(m[0].replace(/[).,;!?]+$/, ''))
  return out
}

/** Der zuletzt genannte Link, so wie ihn die Teilen-Funktion vieler Shops ans Ende des Textes setzt. */
export function lastUrl(text: string): string | null {
  const all = allUrls(text)
  return all.length ? all[all.length - 1] : null
}

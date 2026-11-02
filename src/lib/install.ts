import { useSyncExternalStore } from 'react'

export type Platform = 'ios' | 'android' | 'desktop'

export function platformOf(ua: string, touchPoints = 0): Platform {
  if (/iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && touchPoints > 1)) return 'ios'
  return /Android/.test(ua) ? 'android' : 'desktop'
}

export const platform = (): Platform => platformOf(navigator.userAgent, navigator.maxTouchPoints)

/** Läuft die App schon als installierte Web-App (ohne Browserleiste)? */
export const isStandalone = (): boolean => matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: InstallPromptEvent | null = null
let installed = false
const subs = new Set<() => void>()
const emit = () => subs.forEach((f) => f())

/** Merkt sich die Installationsanfrage von Chrome/Edge (Android, Rechner). */
export function captureInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as InstallPromptEvent
    emit()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    installed = true
    emit()
  })
}

export const useInstall = () => {
  useSyncExternalStore((f) => (subs.add(f), () => subs.delete(f)), () => `${!!deferred}${installed}`)
  return { canPrompt: !!deferred, installed: installed || isStandalone() }
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false
  const ev = deferred
  deferred = null
  emit()
  await ev.prompt()
  return (await ev.userChoice).outcome === 'accepted'
}

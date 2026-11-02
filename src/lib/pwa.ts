import { useSyncExternalStore } from 'react'
import { Capacitor } from '@capacitor/core'

interface PwaState {
  supported: boolean
  waiting: boolean
  checkedAt: number
}

let state: PwaState = { supported: false, waiting: false, checkedAt: 0 }
let reg: ServiceWorkerRegistration | null = null
const subs = new Set<() => void>()
const set = (patch: Partial<PwaState>) => {
  state = { ...state, ...patch }
  subs.forEach((f) => f())
}

export const usePwa = (): PwaState => useSyncExternalStore((f) => (subs.add(f), () => subs.delete(f)), () => state)

type Notify = () => void
let onWaiting: Notify | null = null
export const onUpdateReady = (f: Notify | null) => {
  onWaiting = f
  if (f && state.waiting) f()
}

function watch(r: ServiceWorkerRegistration) {
  const check = () => {
    if (r.waiting && navigator.serviceWorker.controller) {
      set({ waiting: true })
      onWaiting?.()
    }
  }
  check()
  r.addEventListener('updatefound', () => {
    const w = r.installing
    w?.addEventListener('statechange', () => {
      if (w.state === 'installed') check()
    })
  })
}

/** Meldet den Offline-Speicher an. Nur im Browser und in der installierten Web-App, nie in der Android-App. */
export function registerPwa(): void {
  if (Capacitor.isNativePlatform() || !('serviceWorker' in navigator) || !import.meta.env.PROD) return
  set({ supported: true })
  navigator.serviceWorker
    .register('./sw.js')
    .then((r) => {
      reg = r
      watch(r)
      const poll = () => void r.update().catch(() => undefined)
      document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && poll())
    })
    .catch(() => set({ supported: false }))
}

/** Sucht nach einer neuen Version. Gibt zurück, ob eine bereitliegt. */
export async function checkPwaUpdate(): Promise<boolean> {
  if (!reg) throw new Error('no worker')
  await reg.update()
  if (reg.installing) {
    await new Promise<void>((done) => {
      const w = reg!.installing
      if (!w) return done()
      const t = window.setTimeout(done, 8000)
      w.addEventListener('statechange', () => {
        if (w.state === 'installed' || w.state === 'redundant') {
          window.clearTimeout(t)
          done()
        }
      })
    })
  }
  set({ checkedAt: Date.now(), waiting: !!reg.waiting && !!navigator.serviceWorker.controller })
  if (state.waiting) onWaiting?.()
  return state.waiting
}

/** Aktiviert die wartende Version und lädt neu. */
export function applyPwaUpdate(): void {
  const w = reg?.waiting
  if (!w) return location.reload()
  navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true })
  w.postMessage('skip')
}

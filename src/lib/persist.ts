import { useSyncExternalStore } from 'react'
import { isNative } from './backupFiles'

export type PersistState = 'active' | 'inactive' | 'unsupported' | 'native' | 'checking'
export interface PersistInfo {
  state: PersistState
  at: number | null
}

let info: PersistInfo = { state: 'checking', at: null }
const subs = new Set<() => void>()
const set = (next: PersistInfo) => {
  info = next
  subs.forEach((f) => f())
}

/** Fragt den Status ab. `ask`: bei "nicht aktiv" einmal um den Schutz bitten (nur auf Tipp, nicht beim Start). */
export async function checkPersist(ask = false): Promise<void> {
  if (isNative()) return set({ state: 'native', at: Date.now() })
  const s = typeof navigator !== 'undefined' ? navigator.storage : undefined
  if (!s?.persisted) return set({ state: 'unsupported', at: Date.now() })
  try {
    let ok = await s.persisted()
    if (!ok && ask && s.persist) ok = await s.persist()
    set({ state: ok ? 'active' : 'inactive', at: Date.now() })
  } catch {
    set({ state: 'unsupported', at: Date.now() })
  }
}

export function usePersist(): PersistInfo {
  return useSyncExternalStore(
    (f) => {
      subs.add(f)
      return () => subs.delete(f)
    },
    () => info,
  )
}

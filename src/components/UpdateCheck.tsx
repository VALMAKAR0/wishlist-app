import { useEffect, useRef } from 'react'
import { isNative } from '../lib/backupFiles'
import { useUpdate } from '../state/update'
import { useUI } from '../state/ui'

const MIN_GAP_MS = 12 * 3600_000

/** Sucht beim Start (verzögert, höchstens alle 12 Stunden) nach einer neueren App-Version. */
export function UpdateCheck() {
  const { settings } = useUI()
  const { check, enabled } = useUpdate()
  const run = useRef(check)
  run.current = check
  const cfg = useRef(settings)
  cfg.current = settings
  const done = useRef(false)

  useEffect(() => {
    if (!isNative() || !enabled) return
    const id = window.setTimeout(() => {
      if (done.current) return
      done.current = true
      const s = cfg.current
      if (!s.updateCheck || Date.now() - s.updateAt < MIN_GAP_MS) return
      void run.current(false)
    }, 4000)
    return () => window.clearTimeout(id)
  }, [enabled])

  return null
}

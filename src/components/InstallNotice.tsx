import { useEffect, useRef } from 'react'
import { isNative } from '../lib/backupFiles'
import { isStandalone, platform } from '../lib/install'
import { useNav } from '../state/nav'
import { useT, useUI } from '../state/ui'

const KEY = 'wl.installTip'

/** Einmaliger Tipp auf dem iPhone im Browser: erst installieren, weil die installierte App einen eigenen Speicher hat. */
export function InstallNotice() {
  const t = useT()
  const ui = useUI()
  const { open } = useNav()
  const run = useRef(() => {})
  run.current = () => {
    ui.toast({ message: t('Tipp: Installiere die App zuerst. Die installierte App hat einen eigenen Speicher.'), emoji: '📱', actionLabel: t('Anleitung'), onAction: () => open({ type: 'settings', page: 'app' }) })
  }

  useEffect(() => {
    if (isNative() || platform() !== 'ios' || isStandalone()) return
    try {
      if (localStorage.getItem(KEY)) return
    } catch {
      return
    }
    const id = window.setTimeout(() => {
      try {
        localStorage.setItem(KEY, '1')
      } catch {
        /* ohne Speicher kein Merken */
      }
      run.current()
    }, 3000)
    return () => window.clearTimeout(id)
  }, [])

  return null
}

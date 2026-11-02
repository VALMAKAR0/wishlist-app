import { useEffect, useRef } from 'react'
import { applyPwaUpdate, onUpdateReady } from '../lib/pwa'
import { useT, useUI } from '../state/ui'

/** Meldet einmal, wenn die Web-App eine neue Version geladen hat und auf "Neu laden" wartet. */
export function PwaNotice() {
  const t = useT()
  const ui = useUI()
  const say = useRef(() => {})
  say.current = () => ui.toast({ message: t('Neue Version bereit. Lade neu, um sie zu nutzen.'), emoji: '🚀', actionLabel: t('Neu laden'), onAction: applyPwaUpdate })
  useEffect(() => {
    let done = false
    onUpdateReady(() => {
      if (done) return
      done = true
      say.current()
    })
    return () => onUpdateReady(null)
  }, [])
  return null
}

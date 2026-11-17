import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { motion } from 'motion/react'
import { ChartNoAxesColumn, Inbox, Lightbulb, SlidersHorizontal, Sparkles, type LucideIcon } from 'lucide-react'
import { APP_NAME } from '../lib/brand'
import { cap } from '../lib/i18n'
import { useNav, type Tab } from '../state/nav'
import { useT, useUI } from '../state/ui'
import { useStore } from '../state/store'
import { useUpdate } from '../state/update'
import { Logo } from './Primitives'

export function Aurora() {
  return (
    <div className="aurora" aria-hidden>
      <span className="aurora__grain" />
    </div>
  )
}

export const TAB_INFO: Record<Tab, { label: string; icon: LucideIcon }> = {
  wishes: { label: 'Wünsche', icon: Sparkles },
  ideas: { label: 'Ideen', icon: Lightbulb },
  received: { label: 'Erhalten', icon: Inbox },
  stats: { label: 'Statistik', icon: ChartNoAxesColumn },
  more: { label: 'Mehr', icon: SlidersHorizontal },
}

export function TabBar() {
  const t = useT()
  const { tab, setTab } = useNav()
  const { haptic, settings } = useUI()
  const { received } = useStore()
  const { available: updateReady } = useUpdate()
  const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [...settings.tabOrder.filter((id) => !settings.tabsHidden.includes(id)), 'more' as Tab].map((id) => ({ id, ...TAB_INFO[id] }))
  const found = TABS.findIndex((x) => x.id === tab)
  const style = { '--n': TABS.length, '--i': Math.max(0, found) } as CSSProperties

  return (
    <nav className="tabbar" aria-label={t('Hauptnavigation')} data-labels={settings.tabLabels} data-none={found < 0 || undefined}>
      <div className="tabbar__brand" aria-hidden>
        <Logo size={26} />
        <span>{APP_NAME}</span>
      </div>
      <div className="tabbar__inner" style={style}>
        <span className="tabbar__ind" aria-hidden />
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id
          return (
            <button
              key={id}
              className="tab"
              data-active={active}
              aria-current={active ? 'page' : undefined}
              onClick={() => {
                haptic(8)
                setTab(id)
              }}
            >
              <span className="tab__icon">
                <Icon size={21} strokeWidth={active ? 2.3 : 1.8} />
                {id === 'received' && received.length > 0 && !active && <i className="tab__dot" />}
                {id === 'more' && updateReady && !active && <i className="tab__dot" />}
              </span>
              <span className="tab__label">{cap(t(label))}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

/** Kurzer Start-Moment: Bildmarke zeichnet sich, Name läuft ein. Per Timer beendet, nicht per Animations-Callback. */
export function Splash({ onDone }: { onDone: () => void }) {
  const [out, setOut] = useState(false)
  const done = useRef(onDone)
  done.current = onDone

  useEffect(() => {
    const a = setTimeout(() => setOut(true), 1600)
    const b = setTimeout(() => done.current(), 2150)
    return () => {
      clearTimeout(a)
      clearTimeout(b)
    }
  }, [])

  return (
    <motion.div
      className="splash"
      data-out={out}
      onClick={() => setOut(true)}
      animate={out ? { opacity: 0, scale: 1.06 } : { opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
    >
      <Logo size={84} />
      <div className="splash__name" aria-label={APP_NAME}>
        {APP_NAME.split('').map((ch, i) => (
          <motion.span key={i} initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 + i * 0.045, type: 'spring', stiffness: 260, damping: 20 }}>
            {ch}
          </motion.span>
        ))}
      </div>
    </motion.div>
  )
}

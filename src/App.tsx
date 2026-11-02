import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AutoBackup } from './components/AutoBackup'
import { IncomingFile } from './components/IncomingFile'
import { Reminders } from './components/Reminders'
import { UpdateCheck } from './components/UpdateCheck'
import { Aurora, Splash, TabBar } from './components/Chrome'
import { Stage } from './components/Stage'
import { MoreScreen, RoadmapScreen, TrashScreen } from './screens/MoreScreens'
import { IdeasScreen } from './screens/IdeasScreen'
import { ListScreen } from './screens/ListPage'
import { PersonScreen } from './screens/PersonScreen'
import { ReceivedDetailScreen, ReceivedScreen } from './screens/ReceivedScreens'
import { StatsScreen } from './screens/StatsScreen'
import { WishesScreen } from './screens/WishesScreen'
import { handleBack } from './state/back'
import { NavProvider, useNav } from './state/nav'
import { StoreProvider, useStore } from './state/store'
import { UIProvider, useUI } from './state/ui'

function Screens() {
  const { tab, view, dir } = useNav()
  const { dispatch } = useStore()

  let screen
  let key: string
  if (view) {
    key = `view:${view.type}:${'id' in view ? view.id : ''}${view.type === 'received' && view.listId ? ':' + view.listId : ''}`
    screen =
      view.type === 'person' ? <PersonScreen id={view.id} /> :
      view.type === 'received' ? <ReceivedDetailScreen id={view.id} listId={view.listId} /> :
      view.type === 'list' ? <ListScreen id={view.id} /> :
      view.type === 'trash' ? <TrashScreen /> :
      <RoadmapScreen />
  } else {
    key = `tab:${tab}`
    screen =
      tab === 'wishes' ? <WishesScreen /> :
      tab === 'ideas' ? <IdeasScreen /> :
      tab === 'received' ? <ReceivedScreen /> :
      tab === 'stats' ? <StatsScreen /> :
      <MoreScreen />
  }

  // Der Backup-Hinweis gehört nur zum Start: Sobald man die Startseite verlässt, kommt er nicht mehr.
  const firstKey = useRef(key)
  useLayoutEffect(() => {
    if (firstKey.current !== key) {
      firstKey.current = key
      dispatch({ type: 'ackNudge' })
    }
  }, [key, dispatch])

  return (
    <main className="stage">
      <Stage activeKey={key} dir={dir}>
        {screen}
      </Stage>
    </main>
  )
}

/** Leuchtfleck unter dem Finger bzw. Mauszeiger auf allen Karten mit der Klasse .spot. */
function useSpotlight() {
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>('.spot')
      if (!el) return
      const r = el.getBoundingClientRect()
      el.style.setProperty('--mx', `${e.clientX - r.left}px`)
      el.style.setProperty('--my', `${e.clientY - r.top}px`)
    }
    document.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('pointerdown', move, { passive: true })
    return () => {
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerdown', move)
    }
  }, [])
}

/** Android-Zurück-Taste (in der App) und Escape (im Browser): erst Fenster, dann Ansicht, dann erster Reiter, erst danach beenden. */
function useBackKey() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleBack()
    }
    window.addEventListener('keydown', onKey)
    if (!Capacitor.isNativePlatform()) return () => window.removeEventListener('keydown', onKey)
    const sub = CapApp.addListener('backButton', () => {
      if (!handleBack()) void CapApp.exitApp()
    })
    return () => {
      window.removeEventListener('keydown', onKey)
      void sub.then((s) => s.remove())
    }
  }, [])
}

function Shell() {
  const { settings } = useUI()
  const [splash, setSplash] = useState(settings.fx !== 'off')
  useSpotlight()
  useBackKey()

  return (
    <div className="app">
      <Aurora />
      <Screens />
      <TabBar />
      <AutoBackup />
      <IncomingFile />
      <Reminders />
      <UpdateCheck />
      {splash && <Splash onDone={() => setSplash(false)} />}
    </div>
  )
}

export default function App() {
  return (
    <UIProvider>
      <StoreProvider>
        <NavProvider>
          <Shell />
        </NavProvider>
      </StoreProvider>
    </UIProvider>
  )
}

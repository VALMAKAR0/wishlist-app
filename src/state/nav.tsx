import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

export type Tab = 'wishes' | 'ideas' | 'received' | 'more'
export const TAB_ORDER: Tab[] = ['wishes', 'ideas', 'received', 'more']

export type View =
  | { type: 'person'; id: string }
  | { type: 'received'; id: string }
  | { type: 'trash' }
  | { type: 'roadmap' }

interface Nav {
  tab: Tab
  view: View | null
  /** -1 = zurück/links, 1 = vor/rechts. Steuert die Richtung der Übergänge. */
  dir: 1 | -1
  setTab: (t: Tab) => void
  open: (v: View) => void
  back: () => void
}

const Ctx = createContext<Nav | null>(null)

// Detailansichten schieben einen History-Eintrag, damit die Zurück-Geste und
// der Android-Zurück-Button genauso funktionieren wie der Pfeil in der App.
export function NavProvider({ children }: { children: ReactNode }) {
  const [tab, setTabState] = useState<Tab>('wishes')
  const [view, setView] = useState<View | null>(null)
  const [dir, setDir] = useState<1 | -1>(1)
  const depth = useRef(0)
  const tabRef = useRef(tab)
  tabRef.current = tab
  // Anzahl der selbst ausgelösten history.back()-Aufrufe, deren popstate nichts mehr ändern soll.
  const ignorePops = useRef(0)

  useEffect(() => {
    const onPop = () => {
      if (ignorePops.current > 0) {
        ignorePops.current -= 1
        return
      }
      depth.current = 0
      setDir(-1)
      setView(null)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const setTab = useCallback((t: Tab) => {
    const hadView = depth.current > 0
    if (t === tabRef.current && !hadView) return
    setDir(t === tabRef.current ? -1 : TAB_ORDER.indexOf(t) > TAB_ORDER.indexOf(tabRef.current) ? 1 : -1)
    setTabState(t)
    if (hadView) {
      // Zustand sofort umschalten und den History-Eintrag still zurücknehmen.
      depth.current = 0
      setView(null)
      ignorePops.current += 1
      history.back()
    }
  }, [])

  const open = useCallback((v: View) => {
    setDir(1)
    setView(v)
    if (!depth.current) {
      history.pushState({ wl: 1 }, '')
      depth.current = 1
    }
  }, [])

  const back = useCallback(() => {
    if (depth.current) history.back()
  }, [])

  const value = useMemo(() => ({ tab, view, dir, setTab, open, back }), [tab, view, dir, setTab, open, back])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useNav(): Nav {
  const v = useContext(Ctx)
  if (!v) throw new Error('NavProvider fehlt')
  return v
}

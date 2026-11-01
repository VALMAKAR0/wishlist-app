import { setRootBack } from './back'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

export type Tab = 'wishes' | 'ideas' | 'received' | 'stats' | 'more'
export const TAB_ORDER: Tab[] = ['wishes', 'ideas', 'received', 'stats', 'more']

export type View =
  | { type: 'person'; id: string }
  | { type: 'received'; id: string }
  | { type: 'list'; id: string }
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

// Jede geöffnete Ansicht schiebt einen History-Eintrag, damit die Zurück-Geste und
// der Android-Zurück-Button genauso funktionieren wie der Pfeil in der App.
// Ansichten können sich stapeln (Person -> Liste), Zurück geht immer eine Stufe.
export function NavProvider({ children }: { children: ReactNode }) {
  const [tab, setTabState] = useState<Tab>('wishes')
  const [stack, setStack] = useState<View[]>([])
  const [dir, setDir] = useState<1 | -1>(1)
  const depth = useRef(0)
  const tabRef = useRef(tab)
  tabRef.current = tab
  // Anzahl der selbst ausgelösten History-Sprünge, deren popstate nichts mehr ändern soll.
  const ignorePops = useRef(0)
  const view = stack[stack.length - 1] ?? null

  useEffect(() => {
    const onPop = () => {
      if (ignorePops.current > 0) {
        ignorePops.current -= 1
        return
      }
      if (!depth.current) return
      depth.current -= 1
      setDir(-1)
      setStack((s) => s.slice(0, -1))
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const setTab = useCallback((t: Tab) => {
    const n = depth.current
    if (t === tabRef.current && !n) return
    setDir(t === tabRef.current ? -1 : TAB_ORDER.indexOf(t) > TAB_ORDER.indexOf(tabRef.current) ? 1 : -1)
    setTabState(t)
    if (n) {
      // Zustand sofort umschalten und alle History-Einträge der Ansichten still zurücknehmen.
      depth.current = 0
      setStack([])
      ignorePops.current += 1
      history.go(-n)
    }
  }, [])

  const open = useCallback((v: View) => {
    setDir(1)
    setStack((s) => [...s, v])
    history.pushState({ wl: depth.current + 1 }, '')
    depth.current += 1
  }, [])

  const back = useCallback(() => {
    if (depth.current) history.back()
  }, [])

  useEffect(() => {
    setRootBack(() => {
      if (depth.current) {
        history.back()
        return true
      }
      if (tabRef.current !== 'wishes') {
        setTab('wishes')
        return true
      }
      return false
    })
    return () => setRootBack(null)
  }, [setTab])

  const value = useMemo(() => ({ tab, view, dir, setTab, open, back }), [tab, view, dir, setTab, open, back])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useNav(): Nav {
  const v = useContext(Ctx)
  if (!v) throw new Error('NavProvider fehlt')
  return v
}

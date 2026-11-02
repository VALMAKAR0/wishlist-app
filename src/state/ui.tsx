import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { MotionConfig } from 'motion/react'
import type { PlannedId } from '../lib/plannedFeatures'
import { detectLang, makeT, type TFn } from '../lib/i18n'
import { setLocale, uid } from '../lib/format'
import type { UiSettings } from '../lib/types'
import { Overlays } from '../components/Overlays'

export interface ToastOpts {
  message: string
  emoji?: string
  actionLabel?: string
  onAction?: () => void
}

export interface ConfirmOpts {
  title: string
  text: string
  confirmLabel: string
  tone?: 'danger' | 'default'
  /** Bestätigen nur durch langes Drücken (für „Alle Daten löschen“). */
  hold?: boolean
  onConfirm: () => void
}

export interface Burst {
  id: number
  x: number
  y: number
}

interface UI {
  t: TFn
  settings: UiSettings
  setSettings: (patch: Partial<UiSettings>) => void
  planned: (id: PlannedId) => void
  toast: (t: ToastOpts) => void
  confirm: (c: ConfirmOpts) => void
  confetti: (x: number, y: number) => void
  haptic: (ms?: number) => void
}

const Ctx = createContext<UI | null>(null)

const STORAGE_KEY = 'wl.ui'
const defaults = (): UiSettings => ({ theme: 'system', fx: 'full', lang: detectLang(), hue: 14, remindOn: false, remindDays: [14, 3, 0], remindTime: '09:00', updateCheck: true, updateLatest: '', updateUrl: '', updateSeen: '', updateAt: 0, showPlanned: false, autoBackup: true, shareName: '', shareId: '' })

function loadSettings(): UiSettings {
  let s: UiSettings
  try {
    s = { ...defaults(), ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') }
  } catch {
    s = defaults()
  }
  if (!Array.isArray(s.remindDays) || s.remindDays.some((n) => !Number.isInteger(n))) s.remindDays = defaults().remindDays
  if (!/^\d{2}:\d{2}$/.test(s.remindTime)) s.remindTime = defaults().remindTime
  if (!s.shareId) {
    s.shareId = uid()
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
    } catch {
      /* ohne Speicher gilt die Kennung nur für diese Sitzung */
    }
  }
  return s
}

export function UIProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<UiSettings>(loadSettings)
  const [plannedId, setPlannedId] = useState<PlannedId | null>(null)
  const [toast, setToast] = useState<(ToastOpts & { id: number }) | null>(null)
  const [confirm, setConfirm] = useState<ConfirmOpts | null>(null)
  const [bursts, setBursts] = useState<Burst[]>([])
  const seq = useRef(0)
  const t = useMemo(() => makeT(settings.lang), [settings.lang])
  // Zahlen- und Datumsformat gelten ab dem nächsten Rendern der Kinder.
  setLocale(t.locale)

  // Theme, Effekt-Stufe und Akzentfarbe auf das Dokument übertragen.
  useEffect(() => {
    const root = document.documentElement
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = settings.theme === 'dark' || (settings.theme === 'system' && mq.matches)
      root.dataset.theme = dark ? 'dark' : 'light'
      const meta = document.querySelector('meta[name="theme-color"]')
      meta?.setAttribute('content', dark ? '#0f0e17' : '#f7f2ea')
    }
    apply()
    root.dataset.fx = settings.fx
    root.lang = settings.lang
    root.style.setProperty('--hue', String(settings.hue))
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [settings])

  const setSettings = useCallback((patch: Partial<UiSettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...patch }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        /* Speicher nicht verfügbar, Einstellung gilt nur für diese Sitzung */
      }
      return next
    })
  }, [])

  const haptic = useCallback(
    (ms = 12) => {
      if (settings.fx !== 'off') navigator.vibrate?.(ms)
    },
    [settings.fx],
  )

  const value = useMemo<UI>(
    () => ({
      t,
      settings,
      setSettings,
      haptic,
      planned: (id) => setPlannedId(id),
      toast: (t) => setToast({ ...t, id: ++seq.current }),
      confirm: (c) => setConfirm(c),
      confetti: (x, y) => {
        if (settings.fx === 'off') return
        const id = ++seq.current
        setBursts((b) => [...b, { id, x, y }])
        setTimeout(() => setBursts((b) => b.filter((e) => e.id !== id)), 1600)
      },
    }),
    [t, settings, setSettings, haptic],
  )

  return (
    <Ctx.Provider value={value}>
      <MotionConfig reducedMotion={settings.fx === 'off' ? 'always' : 'user'}>
        {children}
        <Overlays
          plannedId={plannedId}
          onClosePlanned={() => setPlannedId(null)}
          confirm={confirm}
          onCloseConfirm={() => setConfirm(null)}
          toast={toast}
          onCloseToast={() => setToast(null)}
          bursts={bursts}
        />
      </MotionConfig>
    </Ctx.Provider>
  )
}

export function useUI(): UI {
  const v = useContext(Ctx)
  if (!v) throw new Error('UIProvider fehlt')
  return v
}

/** Kurzform für Übersetzungen in Komponenten. */
export const useT = (): TFn => useUI().t

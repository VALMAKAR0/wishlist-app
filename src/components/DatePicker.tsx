import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { parseMonthDay } from '../lib/format'
import { useT } from '../state/ui'
import { Dialog } from './Dialog'

interface Props {
  value: string
  recurring?: boolean
  clearable?: boolean
  onPick: (iso: string) => void
  onClose: () => void
}

const pad = (n: number) => String(n).padStart(2, '0')
const toIso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`

/** Eigener Kalender statt der Systemauswahl: passt zum Design und sieht auf jedem Gerät gleich aus. */
export function DatePickerDialog({ value, recurring, clearable, onPick, onClose }: Props) {
  const t = useT()
  const now = new Date()
  const today = toIso(now.getFullYear(), now.getMonth(), now.getDate())
  const start = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : today
  const [view, setView] = useState({ y: Number(start.slice(0, 4)), m: Number(start.slice(5, 7)) - 1 })

  const cells = useMemo(() => {
    const lead = (new Date(view.y, view.m, 1).getDay() + 6) % 7
    const count = new Date(view.y, view.m + 1, 0).getDate()
    return [...Array(lead).fill(0), ...Array.from({ length: count }, (_, i) => i + 1)]
  }, [view])

  const weekdays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => new Date(2026, 0, 5 + i).toLocaleDateString(t.locale, { weekday: 'short' }).replace('.', '').slice(0, 2)),
    [t.locale],
  )
  const title = new Date(view.y, view.m, 1).toLocaleDateString(t.locale, recurring ? { month: 'long' } : { month: 'long', year: 'numeric' })

  const stepMonth = (d: number) =>
    setView(({ y, m }) => {
      const n = m + d
      if (recurring) return { y, m: (n + 12) % 12 }
      return { y: y + Math.floor(n / 12), m: ((n % 12) + 12) % 12 }
    })

  const pick = (iso: string) => {
    onPick(iso)
    onClose()
  }
  const md = recurring ? parseMonthDay(value) : null
  const isSelected = (d: number) => (recurring && md ? md.month === view.m + 1 && md.day === d : value === toIso(view.y, view.m, d))

  return (
    <Dialog label={t('Datum wählen')} onClose={onClose} className="dialog--cal">
      <div className="cal__head">
        {!recurring && (
          <button className="icon-btn icon-btn--sm" onClick={() => setView((v) => ({ ...v, y: v.y - 1 }))} aria-label={t('Vorheriges Jahr')}>
            <ChevronsLeft size={16} />
          </button>
        )}
        <button className="icon-btn icon-btn--sm" onClick={() => stepMonth(-1)} aria-label={t('Vorheriger Monat')}>
          <ChevronLeft size={18} />
        </button>
        <strong className="cal__title" aria-live="polite">
          {title}
        </strong>
        <button className="icon-btn icon-btn--sm" onClick={() => stepMonth(1)} aria-label={t('Nächster Monat')}>
          <ChevronRight size={18} />
        </button>
        {!recurring && (
          <button className="icon-btn icon-btn--sm" onClick={() => setView((v) => ({ ...v, y: v.y + 1 }))} aria-label={t('Nächstes Jahr')}>
            <ChevronsRight size={16} />
          </button>
        )}
      </div>

      <div className="cal__grid cal__grid--week" aria-hidden>
        {weekdays.map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </div>
      <div className="cal__grid" role="grid">
        {cells.map((d, i) =>
          d ? (
            <button
              key={i}
              role="gridcell"
              className="cal__day"
              data-selected={isSelected(d)}
              data-today={!recurring && toIso(view.y, view.m, d) === today}
              onClick={() => pick(toIso(view.y, view.m, d))}
              aria-label={new Date(view.y, view.m, d).toLocaleDateString(t.locale, { day: 'numeric', month: 'long', ...(recurring ? {} : { year: 'numeric' }) })}
            >
              {d}
            </button>
          ) : (
            <span key={i} />
          ),
        )}
      </div>

      <div className="dialog__actions">
        {!recurring && (
          <button className="btn btn--ghost" onClick={() => pick(today)}>
            {t('Heute')}
          </button>
        )}
        {clearable && value && (
          <button className="btn btn--ghost" onClick={() => pick('')}>
            {t('Entfernen')}
          </button>
        )}
        <button className="btn btn--ghost" onClick={onClose}>
          {t('Abbrechen')}
        </button>
      </div>
    </Dialog>
  )
}

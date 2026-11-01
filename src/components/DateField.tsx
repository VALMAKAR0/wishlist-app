import { CalendarDays, X } from 'lucide-react'
import { daysUntil, daysUntilIso, distanceLabel, isoLabel, parseMonthDay } from '../lib/format'
import { useT } from '../state/ui'

interface Props {
  value: string
  onChange: (v: string) => void
  label: string
  placeholder?: string
  /** Jährlich wiederkehrend: Jahr wird nicht angezeigt, der Zähler zeigt den nächsten Termin. */
  recurring?: boolean
  clearable?: boolean
}

/** Datumsfeld als große Fläche mit Anzeige und Abstand in Tagen. Darüber liegt die Datumsauswahl des Systems. */
export function DateField({ value, onChange, label, placeholder, recurring, clearable }: Props) {
  const t = useT()
  const md = parseMonthDay(value)
  const days = value ? (recurring ? (md ? daysUntil(md) : null) : daysUntilIso(value)) : null
  return (
    <div className="datefield">
      <label className="datefield__box" data-empty={!value}>
        <CalendarDays size={18} aria-hidden />
        <span className="datefield__text">{value ? isoLabel(value, !recurring) : (placeholder ?? t('Datum wählen'))}</span>
        {days !== null && <em data-soon={days >= 0 && days <= 14}>{distanceLabel(days, t)}</em>}
        <input
          type="date"
          className="datefield__input"
          value={value}
          aria-label={label}
          onChange={(e) => onChange(e.target.value)}
          onClick={(e) => {
            try {
              e.currentTarget.showPicker()
            } catch {
              /* ältere Browser öffnen die Auswahl selbst */
            }
          }}
        />
      </label>
      {clearable && value && (
        <button type="button" className="icon-btn icon-btn--sm" onClick={() => onChange('')} aria-label={t('Datum entfernen')}>
          <X size={16} />
        </button>
      )}
    </div>
  )
}

import { useState } from 'react'
import { CalendarDays, X } from 'lucide-react'
import { daysUntil, daysUntilIso, distanceLabel, isoLabel, parseMonthDay } from '../lib/format'
import { useT } from '../state/ui'
import { DatePickerDialog } from './DatePicker'
import { Presence } from './Presence'

interface Props {
  value: string
  onChange: (v: string) => void
  label: string
  placeholder?: string
  /** Jährlich wiederkehrend: Jahr wird nicht angezeigt, der Zähler zeigt den nächsten Termin. */
  recurring?: boolean
  clearable?: boolean
}

/** Datumsfeld als große Fläche mit Anzeige und Abstand in Tagen. Tippen öffnet den Kalender der App. */
export function DateField({ value, onChange, label, placeholder, recurring, clearable }: Props) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const md = parseMonthDay(value)
  const days = value ? (recurring ? (md ? daysUntil(md) : null) : daysUntilIso(value)) : null
  return (
    <div className="datefield">
      <button type="button" className="datefield__box" data-empty={!value} onClick={() => setOpen(true)} aria-label={label} aria-haspopup="dialog">
        <CalendarDays size={18} aria-hidden />
        <span className="datefield__text">{value ? isoLabel(value, !recurring) : (placeholder ?? t('Datum wählen'))}</span>
        {days !== null && <em data-soon={days >= 0 && days <= 14}>{distanceLabel(days, t)}</em>}
      </button>
      {clearable && value && (
        <button type="button" className="icon-btn icon-btn--sm" onClick={() => onChange('')} aria-label={t('Datum entfernen')}>
          <X size={16} />
        </button>
      )}
      <Presence show={open}>{open && <DatePickerDialog value={value} recurring={recurring} clearable={clearable} onPick={onChange} onClose={() => setOpen(false)} />}</Presence>
    </div>
  )
}

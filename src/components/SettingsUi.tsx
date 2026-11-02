import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { Switch } from './Primitives'

export function Row({ icon, title, text, right, onClick }: { icon: ReactNode; title: string; text?: string; right?: ReactNode; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag className="row-item" onClick={onClick}>
      <span className="row-item__icon">{icon}</span>
      <span className="row-item__main">
        <strong>{title}</strong>
        {text && <small>{text}</small>}
      </span>
      {right ?? (onClick && <ChevronRight size={18} className="row-item__chev" />)}
    </Tag>
  )
}

/** Auswahl aus wenigen Werten als Chips. */
export function ChipChoice<T extends string | number>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string }) {
  return (
    <div className="listbar listbar--form" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} className="listchip" role="radio" aria-checked={o.value === value} data-active={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Zeile mit Titel, Erklärung und Schalter. */
export function SwitchRow({ title, text, checked, onChange }: { title: string; text?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="setting">
      <div>
        <strong>{title}</strong>
        {text && <p>{text}</p>}
      </div>
      <Switch checked={checked} onChange={onChange} label={title} />
    </div>
  )
}

/** Titel mit Erklärung über einer Auswahl. */
export function Choice({ title, text, children }: { title: string; text?: string; children: ReactNode }) {
  return (
    <div className="setting setting--col">
      <div>
        <strong>{title}</strong>
        {text && <p>{text}</p>}
      </div>
      {children}
    </div>
  )
}

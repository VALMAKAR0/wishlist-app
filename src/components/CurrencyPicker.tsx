import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronDown } from 'lucide-react'
import { CURRENCIES } from '../lib/format'
import { useT } from '../state/ui'

const INFO: Record<string, [string, string]> = {
  EUR: ['€', 'Euro'],
  USD: ['$', 'US-Dollar'],
  GBP: ['£', 'Britisches Pfund'],
  CHF: ['Fr.', 'Schweizer Franken'],
  CZK: ['Kč', 'Tschechische Krone'],
  PLN: ['zł', 'Polnischer Złoty'],
  DKK: ['kr', 'Dänische Krone'],
  SEK: ['kr', 'Schwedische Krone'],
  NOK: ['kr', 'Norwegische Krone'],
  JPY: ['¥', 'Japanischer Yen'],
  CAD: ['C$', 'Kanadischer Dollar'],
  AUD: ['A$', 'Australischer Dollar'],
}

/** Knopf mit der gewählten Währung, öffnet die Auswahl. */
export function CurrencyButton({ value, open, onToggle }: { value: string; open: boolean; onToggle: () => void }) {
  const t = useT()
  return (
    <button type="button" className="curbtn" data-open={open} aria-haspopup="listbox" aria-expanded={open} aria-label={`${t('Währung')}: ${value}`} onClick={onToggle}>
      <span className="curbtn__sym">{INFO[value]?.[0] ?? value}</span>
      <b>{value}</b>
      <ChevronDown size={16} />
    </button>
  )
}

/** Auswahl als Raster unter dem Preisfeld. */
export function CurrencyPanel({ open, value, onPick, onClose }: { open: boolean; value: string; onPick: (c: string) => void; onClose: () => void }) {
  const t = useT()
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const id = window.setTimeout(() => box.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 260)
    return () => window.clearTimeout(id)
  }, [open])
  useEffect(() => {
    if (!open) return
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', key, true)
    return () => window.removeEventListener('keydown', key, true)
  }, [open, onClose])
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div className="curpanel" role="listbox" aria-label={t('Währung')} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 32 }}>
          <div className="curpanel__grid" ref={box}>
            {CURRENCIES.map((c) => (
              <button key={c} type="button" role="option" aria-selected={c === value} className="curopt" data-on={c === value} onClick={() => onPick(c)}>
                <span className="curopt__sym">{INFO[c]?.[0] ?? c}</span>
                <span className="curopt__txt">
                  <b>{c}</b>
                  <small>{t(INFO[c]?.[1] ?? c)}</small>
                </span>
                {c === value && <Check size={15} className="curopt__check" />}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

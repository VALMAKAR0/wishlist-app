import { AnimatePresence, motion } from 'motion/react'
import { Check, Copy, EyeOff, Loader2, Minus, Pencil, TriangleAlert, X } from 'lucide-react'
import type { FieldKey, FieldReport, FieldState } from '../lib/linkImport'
import { useT, useUI } from '../state/ui'

export interface Report {
  url: string
  status: 'loading' | 'done' | 'error'
  step?: string
  fields: FieldReport[]
  source?: string
  error?: string
  tech?: string
}

const LABEL: Record<FieldKey, string> = { name: 'Name', price: 'Preis', image: 'Bild' }

const ICON: Record<FieldState, typeof Check> = { ok: Check, guess: TriangleAlert, none: Minus, off: EyeOff, kept: Pencil }

/** Zeigt beim Link-Import, was gefunden, nicht gefunden, geraten oder ausgeschaltet war. */
export function LinkReport({ report, onClose }: { report: Report; onClose: () => void }) {
  const t = useT()
  const ui = useUI()

  const note = (f: FieldReport): string => {
    if (f.state === 'off') return t('In den Einstellungen aus')
    if (f.state === 'kept') return t('Schon ausgefüllt, nicht überschrieben')
    if (f.state === 'guess') return `${f.text ?? ''} · ${t('aus dem Seitentext geraten, bitte prüfen')}`
    if (f.state === 'none') return t(f.why ?? 'Nicht gefunden')
    return f.text ?? ''
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(report.tech ?? '')
      ui.toast({ message: t('Details kopiert'), emoji: '📋' })
    } catch {
      ui.toast({ message: t('Kopieren nicht erlaubt.'), emoji: '⚠️' })
    }
  }

  return (
    <motion.div
      className="linkrep"
      data-status={report.status}
      data-testid="link-report"
      layout
      initial={{ opacity: 0, height: 0, y: -6 }}
      animate={{ opacity: 1, height: 'auto', y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
    >
      <div className="linkrep__head">
        {report.status === 'loading' ? (
          <span className="linkrep__title">
            <Loader2 size={14} className="spin" /> {t(report.step ?? 'Seite wird geladen …')}
          </span>
        ) : report.status === 'error' ? (
          <span className="linkrep__title linkrep__title--bad">
            <TriangleAlert size={14} /> {t('Nicht gelesen')}
          </span>
        ) : (
          <span className="linkrep__title">{t('Das hat die App gefunden')}</span>
        )}
        <button type="button" className="linkrep__x" onClick={onClose} aria-label={t('Schließen')}>
          <X size={14} />
        </button>
      </div>
      {report.status === 'loading' && <div className="linkrep__bar" aria-hidden />}
      {report.status === 'error' && (
        <p className="linkrep__err" role="alert">
          {report.error}
        </p>
      )}
      <AnimatePresence initial={false}>
        {report.status === 'done' && (
          <ul className="linkrep__list">
            {report.fields.map((f, i) => {
              const Icon = ICON[f.state]
              return (
                <motion.li key={f.key} className="linkrep__row" data-state={f.state} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.09, type: 'spring', stiffness: 420, damping: 30 }}>
                  <span className="linkrep__ico">
                    <Icon size={13} />
                  </span>
                  <span className="linkrep__lab">{t(LABEL[f.key])}</span>
                  <span className="linkrep__txt">{note(f)}</span>
                </motion.li>
              )
            })}
          </ul>
        )}
      </AnimatePresence>
      {report.status !== 'loading' && report.tech && (
        <div className="linkrep__foot">
          {report.source && <span>{t('Quelle')}: {report.source}</span>}
          <button type="button" className="chip chip--button" onClick={() => void copy()}>
            <Copy size={12} /> {t('Details kopieren')}
          </button>
        </div>
      )}
    </motion.div>
  )
}

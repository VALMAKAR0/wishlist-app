import { useEffect, useMemo, useRef } from 'react'
import { Check } from 'lucide-react'
import { money } from '../lib/format'
import { findSpot, type PriceCandidate } from '../lib/linkImport'
import type { PriceSpot } from '../lib/types'
import { useT } from '../state/ui'
import { Sheet } from './Sheet'

/** Auswahl: Welcher der gefundenen Preise gehört zum Artikel? Nach Preis sortiert, der aktuelle ist markiert. */
export function PriceChooser({ candidates, current, spot, cur, onPick, onClose }: { candidates: PriceCandidate[]; current?: number; spot?: PriceSpot; cur?: string; onPick: (c: PriceCandidate) => void; onClose: () => void }) {
  const t = useT()
  const nowRef = useRef<HTMLLIElement>(null)
  const sorted = useMemo(() => [...candidates].sort((a, b) => a.price - b.price), [candidates])
  const byPrice = (c: PriceCandidate) => current !== undefined && Math.abs(current - c.price) < 0.005
  const bySpot = spot ? findSpot(sorted, spot) : undefined
  const isNow = (c: PriceCandidate) => (bySpot && byPrice(bySpot) ? c === bySpot : byPrice(c))
  const found = sorted.some(isNow)
  useEffect(() => {
    const id = window.setTimeout(() => nowRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 380)
    return () => window.clearTimeout(id)
  }, [])
  const where = (c: PriceCandidate) => (c.src === 'ld' ? t('Produktdaten der Seite') : c.src === 'meta' ? t('Meta-Angaben der Seite') : c.src === 'dom' ? t(c.label) : c.label ? `… ${c.label}` : t('Im Text der Seite'))
  let marked = false
  return (
    <Sheet title={t('Welcher Preis ist richtig?')} subtitle={t('Tippe den Preis an, der zu deinem Artikel gehört. Die App liest danach immer genau von dieser Stelle.')} onClose={onClose}>
      {sorted.length === 0 ? (
        <p className="hint hint--pad">{t('Auf der Seite wurden keine Preise gefunden.')}</p>
      ) : (
        <>
          {current !== undefined && !found && (
            <p className="pchoice__miss" data-testid="price-current-missing">
              <strong>{t('Aktuell')}: {money(current, cur)}</strong> {t('Dieser Preis steht nicht in der Liste, er ist von dir eingetragen oder die Seite zeigt ihn nicht mehr.')}
            </p>
          )}
          <ul className="pchoice" data-testid="price-chooser">
            {sorted.map((c, i) => {
              const now = isNow(c) && !marked
              if (now) marked = true
              return (
                <li key={`${c.src}-${c.ctx}-${c.price}-${i}`} ref={now ? nowRef : undefined}>
                  <button type="button" className="pchoice__row" data-now={now || undefined} data-testid="price-candidate" onClick={() => onPick(c)}>
                    <span className="pchoice__price">{money(c.price, c.currency)}</span>
                    <span className="pchoice__where">{where(c)}</span>
                    {c.after && c.src === 'text' && <small className="pchoice__after">{t('danach')}: {c.after}</small>}
                    {now && (
                      <span className="pchoice__now">
                        <Check size={12} /> {t('Aktuell')}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </Sheet>
  )
}

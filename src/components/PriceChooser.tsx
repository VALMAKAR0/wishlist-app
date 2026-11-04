import { Check } from 'lucide-react'
import { money } from '../lib/format'
import type { PriceCandidate } from '../lib/linkImport'
import { useT } from '../state/ui'
import { Sheet } from './Sheet'

/** Auswahl: Welcher der gefundenen Preise gehört zum Artikel? Die gewählte Stelle wird gemerkt. */
export function PriceChooser({ candidates, current, onPick, onClose }: { candidates: PriceCandidate[]; current?: number; onPick: (c: PriceCandidate) => void; onClose: () => void }) {
  const t = useT()
  const where = (c: PriceCandidate) => (c.src === 'ld' ? t('Produktdaten der Seite') : c.src === 'meta' ? t('Meta-Angaben der Seite') : c.label ? `… ${c.label}` : t('Im Text der Seite'))
  return (
    <Sheet title={t('Welcher Preis ist richtig?')} subtitle={t('Tippe den Preis an, der zu deinem Artikel gehört. Die App liest danach immer genau von dieser Stelle.')} onClose={onClose}>
      {candidates.length === 0 ? (
        <p className="hint hint--pad">{t('Auf der Seite wurden keine Preise gefunden.')}</p>
      ) : (
        <ul className="pchoice" data-testid="price-chooser">
          {candidates.map((c, i) => (
            <li key={`${c.src}-${c.ctx}-${c.price}-${i}`}>
              <button type="button" className="pchoice__row" data-testid="price-candidate" onClick={() => onPick(c)}>
                <span className="pchoice__price">{money(c.price, c.currency)}</span>
                <span className="pchoice__where">{where(c)}</span>
                {c.after && c.src === 'text' && <small className="pchoice__after">{t('danach')}: {c.after}</small>}
                {current !== undefined && Math.abs(current - c.price) < 0.005 && (
                  <span className="pchoice__now">
                    <Check size={12} /> {t('Aktuell')}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  )
}

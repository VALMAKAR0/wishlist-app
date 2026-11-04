import { ExternalLink } from 'lucide-react'
import { priceSearches } from '../lib/linkImport'
import { useT } from '../state/ui'

/** Links zum Preisvergleich: öffnen die Suche im Browser, die App liest diese Seiten nicht. */
export function PriceSearch({ name }: { name: string }) {
  const t = useT()
  const list = name.trim().length >= 3 ? priceSearches(name) : []
  if (!list.length) return null
  return (
    <div className="psearch" data-testid="price-search">
      <span className="psearch__lab">{t('Weitere Preise suchen')}</span>
      <div className="psearch__row">
        {list.map((s) => (
          <a key={s.id} className="chip chip--button" href={s.url} target="_blank" rel="noopener noreferrer" data-testid={`psearch-${s.id}`}>
            <ExternalLink size={12} /> {s.label}
          </a>
        ))}
      </div>
      <small className="hint">{t('Öffnet die Suche im Browser. Die App liest diese Seiten nicht.')}</small>
    </div>
  )
}

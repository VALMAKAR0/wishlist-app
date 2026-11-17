import { LayoutGrid, Rows3 } from 'lucide-react'
import { useT, useUI } from '../state/ui'

/** Schaltet die Listen zwischen "eine pro Zeile" und Kacheln um. Gilt überall, wo Listen stehen. */
export function LayoutToggle() {
  const t = useT()
  const { settings, setSettings } = useUI()
  const rows = settings.listLayout === 'rows'
  return (
    <button
      type="button"
      className="icon-btn icon-btn--sm"
      data-testid="layout-toggle"
      aria-label={rows ? t('Als Kacheln zeigen') : t('Untereinander zeigen')}
      onClick={() => setSettings({ listLayout: rows ? 'grid' : 'rows' })}
    >
      {rows ? <LayoutGrid size={16} /> : <Rows3 size={16} />}
    </button>
  )
}

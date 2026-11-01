import { DatabaseZap } from 'lucide-react'
import { useT } from '../state/ui'

/** Gespeicherte Daten stammen aus einer neueren App-Version: nichts laden, nichts überschreiben. */
export function BootNotice({ version }: { version: number }) {
  const t = useT()
  return (
    <main className="boot">
      <div className="boot__card">
        <span className="boot__icon" aria-hidden>
          <DatabaseZap size={26} />
        </span>
        <h1>{t('Daten aus einer neueren Version')}</h1>
        <p>{t('Die gespeicherten Daten haben das Format {v}, diese App-Version kennt nur ältere. Damit nichts beschädigt wird, wurde nichts geladen und nichts verändert.', { v: version })}</p>
        <button className="btn btn--primary btn--block" onClick={() => location.reload()}>
          {t('Neu laden')}
        </button>
      </div>
    </main>
  )
}

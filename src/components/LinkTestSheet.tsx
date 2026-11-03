import { useState } from 'react'
import { ClipboardPaste, Copy, ExternalLink, Loader2, Search } from 'lucide-react'
import { describeResult, fetchProduct, idealoSearch, knownCurrency, linkFailExtra, linkFailText, LinkError, type Diagnostics, type Product } from '../lib/linkImport'
import { money } from '../lib/format'
import { useT, useUI } from '../state/ui'
import { Sheet } from './Sheet'

/** Testfenster: Link einfügen, lesen, anzeigen was die App findet. */
export function LinkTestSheet({ onClose }: { onClose: () => void }) {
  const t = useT()
  const ui = useUI()
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [product, setProduct] = useState<Product | null>(null)
  const [diag, setDiag] = useState<Diagnostics | undefined>()
  const [err, setErr] = useState('')

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) setUrl(text.trim())
    } catch {
      ui.toast({ message: t('Einfügen nicht erlaubt. Halte das Feld gedrückt und wähle „Einfügen“.'), emoji: '📋' })
    }
  }

  const reason = (e: unknown) => {
    const x = linkFailExtra(e)
    return (x.status ? ` (HTTP ${x.status})` : x.why ? ` ${t(x.why)}` : '') + (e instanceof LinkError && e.detail ? ` [${e.detail}]` : '')
  }

  const run = async () => {
    if (busy) return
    setBusy(true)
    setErr('')
    setProduct(null)
    setDiag(undefined)
    try {
      const r = await fetchProduct(url)
      setProduct(r.product)
      setDiag(r.diag)
      ui.haptic(15)
    } catch (e) {
      setErr(t(linkFailText(e)) + reason(e))
      if (e instanceof LinkError) setDiag(e.diag)
      ui.haptic(60)
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(describeResult(url, diag, product, err))
      ui.toast({ message: t('Details kopiert'), emoji: '📋' })
    } catch {
      ui.toast({ message: t('Kopieren nicht erlaubt.'), emoji: '⚠️' })
    }
  }

  const search = product ? idealoSearch(product) : null
  const cur = product?.currency
  const priceStr = product?.price === undefined ? undefined : knownCurrency(cur) ? money(product.price, cur) : `${product.price.toFixed(2)} ${cur ?? ''}`.trim()

  return (
    <Sheet title={t('Link testen')} subtitle={t('Zeigt, was die App aus einer Produktseite liest')} onClose={onClose}>
      <div className="field">
        <span>{t('Produktlink')}</span>
        <div className="linkrow">
          <input data-testid="link-url" inputMode="url" autoCapitalize="off" autoCorrect="off" spellCheck={false} placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void run()} />
          <button className="icon-btn" onClick={() => void paste()} aria-label={t('Einfügen')}>
            <ClipboardPaste size={18} />
          </button>
        </div>
      </div>
      <button className="btn btn--primary btn--block" onClick={() => void run()} disabled={busy || !url.trim()} data-testid="link-read">
        {busy ? <Loader2 size={16} className="spin" /> : <Search size={16} />} {busy ? t('Lese Seite …') : t('Lesen')}
      </button>

      {err && (
        <p className="hint hint--warn hint--pad" data-testid="link-error" role="alert">
          {err}
        </p>
      )}

      {product && (
        <div className="linkres" data-testid="link-result">
          {ui.settings.linkImages && product.image && <img className="linkres__img" src={product.image} alt="" referrerPolicy="no-referrer" loading="lazy" />}
          <dl>
            <dt>{t('Name')}</dt>
            <dd>{product.name ?? '–'}</dd>
            <dt>{t('Marke')}</dt>
            <dd>{product.brand ?? '–'}</dd>
            <dt>{t('Preis')}</dt>
            <dd>{priceStr ?? '–'}</dd>
            <dt>{t('EAN')}</dt>
            <dd>{product.gtin ? `${product.gtin}${product.gtinOk === false ? ` · ${t('Prüfziffer stimmt nicht')}` : ''}` : '–'}</dd>
            <dt>{t('Bild')}</dt>
            <dd>{product.image ? (product.imageGuess ? `${t('gefunden')} · ${t('geraten')}` : t('gefunden')) : '–'}</dd>
            <dt>{t('Quelle')}</dt>
            <dd>{product.sources.join(', ') || '–'}</dd>
          </dl>
        </div>
      )}

      {product && search && (
        <>
          <a className="btn btn--ghost btn--block" href={search} target="_blank" rel="noopener noreferrer" data-testid="link-idealo">
            <ExternalLink size={16} /> {t('Bei Idealo suchen')}
          </a>
          <p className="hint hint--pad">{t('Öffnet die Suche im Browser. Die App liest dort nichts aus. Den Link der passenden Seite kannst du zurück in die App kopieren.')}</p>
        </>
      )}

      {(diag || err) && (
        <details className="linkdiag">
          <summary>{t('Technische Details')}</summary>
          <pre>{describeResult(url, diag, product, err)}</pre>
          <button className="btn btn--ghost btn--small" onClick={() => void copy()}>
            <Copy size={14} /> {t('Details kopieren')}
          </button>
        </details>
      )}
    </Sheet>
  )
}

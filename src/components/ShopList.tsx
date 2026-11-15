import { useState } from 'react'
import { ArrowUpRight, ExternalLink, Loader2, Plus, RefreshCw, Store, X } from 'lucide-react'
import { isNative } from '../lib/backupFiles'
import { agoLabel, curOf, hostOf, money, toHref } from '../lib/format'
import { extractUrl } from '../lib/linkImport'
import { MAX_SHOPS, cheaperShop, makeShop, offers, promoteShop, readShop } from '../lib/shops'
import type { Item, Shop } from '../lib/types'
import { useStore } from '../state/store'
import { useT, useUI } from '../state/ui'

interface Props {
  item: Item
  link: string
  onPromoted: (link: string, price: number, cur: string) => void
}

/** Weitere Shops für denselben Wunsch: Preise nebeneinander, günstigster Shop, Wechsel des Hauptlinks. */
export function ShopList({ item, link, onPromoted }: Props) {
  const t = useT()
  const ui = useUI()
  const { dispatch } = useStore()
  const native = isNative()
  const shops = item.shops ?? []
  const [open, setOpen] = useState(shops.length > 0)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState<string | 'all' | null>(null)
  const [msg, setMsg] = useState('')
  const cur = curOf(item)
  const patch = (p: Partial<Item>) => dispatch({ type: 'updateItem', id: item.id, patch: p })
  const setShops = (next: Shop[]) => patch({ shops: next.length ? next : undefined })
  const replace = (s: Shop) => dispatch({ type: 'updateItem', id: item.id, patch: { shops: (item.shops ?? []).map((x) => (x.id === s.id ? s : x)) } })
  const best = offers(item)[0]
  const cheaper = cheaperShop(item)

  const add = async () => {
    const url = extractUrl(text) ?? text.trim()
    const r = makeShop({ link, shops }, url)
    if (!r.ok) {
      setMsg(r.why === 'full' ? t('Mehr als {n} Shops gehen nicht.', { n: MAX_SHOPS }) : r.why === 'dupe' ? t('Diesen Shop hast du schon.') : r.why === 'main' ? t('Das ist schon der Hauptlink.') : '')
      return
    }
    setMsg('')
    setText('')
    const next = [...shops, r.shop]
    setShops(next)
    ui.haptic(12)
    if (!native) return
    setBusy(r.shop.id)
    const done = await readShop(r.shop)
    dispatch({ type: 'updateItem', id: item.id, patch: { shops: next.map((x) => (x.id === done.id ? done : x)) } })
    setBusy(null)
  }

  const refresh = async (s: Shop) => {
    if (busy) return
    setBusy(s.id)
    replace(await readShop(s))
    setBusy(null)
  }

  const refreshAll = async () => {
    if (busy || !shops.length) return
    setBusy('all')
    setMsg('')
    const out: Shop[] = []
    for (const s of shops) out.push(await readShop(s))
    patch({ shops: out })
    setBusy(null)
    const miss = out.filter((s) => s.err).length
    setMsg(miss ? t('{n} Shops ohne Preis gelesen.', { n: miss }) : t('Alle Shops geprüft.'))
    ui.haptic(16)
  }

  const promote = (s: Shop) => {
    const p = promoteShop(item, s.id)
    if (!p) return
    const before = { link: item.link, price: item.price, shops: item.shops }
    patch(p)
    onPromoted(s.link, s.price as number, s.currency ?? 'EUR')
    ui.haptic(18)
    ui.toast({
      message: t('Hauptlink ist jetzt {h}', { h: hostOf(s.link) }),
      emoji: '🛒',
      actionLabel: t('Rückgängig'),
      onAction: () => {
        patch({ ...before, priceSpot: item.priceSpot, priceState: item.priceState, priceBase: item.priceBase, priceLog: item.priceLog, priceGuessOk: item.priceGuessOk, priceSuggest: item.priceSuggest, priceNo: item.priceNo, priceCheckedAt: item.priceCheckedAt, currency: item.currency })
        onPromoted(before.link ?? '', before.price ?? 0, curOf(item))
      },
    })
  }

  if (!open && !shops.length) {
    return (
      <button type="button" className="btn btn--small btn--ghost shops__open" data-testid="shops-open" onClick={() => setOpen(true)}>
        <Store size={14} /> {t('Weitere Shops vergleichen')}
      </button>
    )
  }

  return (
    <section className="shops" data-testid="shops">
      <div className="shops__head">
        <strong>
          <Store size={15} /> {t('Weitere Shops')}
        </strong>
        {shops.length > 0 && (
          <button type="button" className="btn btn--small btn--ghost" data-testid="shops-check" disabled={!native || !!busy} onClick={() => void refreshAll()}>
            {busy === 'all' ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />} {t('Alle Shops prüfen')}
          </button>
        )}
      </div>

      {cheaper && (
        <p className="shops__best" data-testid="shops-best">
          {t('Günstiger bei {h}: {p} (Hauptlink {m})', { h: hostOf((cheaper.shop as Shop).link), p: money(cheaper.price, cur), m: money(item.price as number, cur) })}
        </p>
      )}

      <ul className="shops__list">
        {link.trim() && (
          <li className="shop" data-main data-best={best && !best.shop ? true : undefined}>
            <span className="shop__host">{hostOf(link)}</span>
            <span className="shop__price">{item.price !== undefined ? money(item.price, cur) : '–'}</span>
            <small className="shop__sub">{t('Hauptlink')}</small>
          </li>
        )}
        {shops.map((s) => {
          const foreign = s.price !== undefined && (s.currency ?? 'EUR') !== cur
          const isBest = best?.shop?.id === s.id
          return (
            <li key={s.id} className="shop" data-testid={`shop-${s.id}`} data-best={isBest || undefined}>
              <a className="shop__host" href={toHref(s.link)} target="_blank" rel="noopener noreferrer">
                {hostOf(s.link)} <ExternalLink size={12} />
              </a>
              <span className="shop__price" data-err={s.err || undefined}>
                {busy === s.id || busy === 'all' ? <Loader2 size={14} className="spin" /> : s.price !== undefined ? money(s.price, s.currency ?? 'EUR') : s.err ? t('kein Preis') : '–'}
              </span>
              <small className="shop__sub">
                {s.at ? agoLabel(s.at, t) : t('noch nicht geprüft')}
                {s.guess ? ` · ${t('geraten')}` : ''}
                {foreign ? ` · ${t('andere Währung, nicht verglichen')}` : ''}
              </small>
              <span className="shop__acts">
                {s.price !== undefined && !foreign && s.price < (item.price ?? Infinity) - 0.005 && (
                  <button type="button" className="chip chip--button" data-testid={`shop-promote-${s.id}`} onClick={() => promote(s)}>
                    <ArrowUpRight size={13} /> {t('Als Hauptlink')}
                  </button>
                )}
                <button type="button" className="icon-btn icon-btn--small" aria-label={t('Prüfen')} disabled={!native || !!busy} onClick={() => void refresh(s)}>
                  <RefreshCw size={14} />
                </button>
                <button type="button" className="icon-btn icon-btn--small" aria-label={t('Entfernen')} data-testid={`shop-del-${s.id}`} onClick={() => setShops(shops.filter((x) => x.id !== s.id))}>
                  <X size={14} />
                </button>
              </span>
            </li>
          )
        })}
      </ul>

      {shops.length < MAX_SHOPS && (
        <div className="shops__add">
          <input value={text} placeholder={t('Link des anderen Shops')} inputMode="url" autoCapitalize="off" data-testid="shop-input" onChange={(e) => { setText(e.target.value); setMsg('') }} onKeyDown={(e) => { if (e.key === 'Enter') void add() }} />
          <button type="button" className="btn btn--small btn--primary" data-testid="shop-add" disabled={!text.trim()} onClick={() => void add()}>
            <Plus size={14} /> {t('Hinzufügen')}
          </button>
        </div>
      )}
      {msg && <p className="pw__msg" data-tone="warn" role="status">{msg}</p>}
      <p className="pw__hint">{native ? t('Die App liest den Preis jeder Seite wie beim Hauptlink. Bei manchen Shops klappt das nicht, dann zählt dein Hauptlink.') : t('Preise lesen geht nur in der Android-App. Die Links kannst du trotzdem schon sammeln.')}</p>
    </section>
  )
}

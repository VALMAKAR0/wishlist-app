import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, CircleHelp, Loader2, RefreshCw, TrendingDown, TrendingUp, X } from 'lucide-react'
import { isNative } from '../lib/backupFiles'
import { agoLabel, curOf, money } from '../lib/format'
import { linkFailExtra, linkFailText } from '../lib/linkImport'
import { acceptSuggestion, applyCheck, confirmPrice, priceDelta, readFound, rejectSuggestion, type Outcome } from '../lib/priceCheck'
import type { Item } from '../lib/types'
import { useStore } from '../state/store'
import { useT, useUI } from '../state/ui'
import { PriceChart } from './PriceChart'
import { Switch } from './Primitives'

type Msg = { text: string; tone: 'ok' | 'warn' }

/** Preisbeobachtung im Eintrag: prüfen, Vorschlag bestätigen, Verlauf ansehen, abschalten. */
export function PriceWatch({ item, link, onPrice }: { item: Item; link: string; onPrice: (price: number, cur: string) => void }) {
  const t = useT()
  const ui = useUI()
  const { dispatch } = useStore()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<Msg | null>(null)
  const on = item.priceTrack !== false
  const cur = curOf(item)
  const patch = (p: Partial<Item>) => dispatch({ type: 'updateItem', id: item.id, patch: p })
  const native = isNative()
  const hasLink = !!link.trim()
  const delta = priceDelta(item)
  const log = item.priceLog ?? []

  const describe = (o: Outcome): Msg => {
    switch (o.kind) {
      case 'none':
        return { text: t('Auf der Seite wurde kein Preis gefunden.'), tone: 'warn' }
      case 'currency':
        return { text: t('Die Seite nennt den Preis in {c}, der Eintrag in {d}. Nichts geändert.', { c: o.currency, d: cur }), tone: 'warn' }
      case 'same':
        return { text: t('Preis unverändert.'), tone: 'ok' }
      case 'ignored':
        return { text: t('Unverändert, der Vorschlag wurde von dir abgelehnt.'), tone: 'ok' }
      case 'set':
        return { text: t('Preis eingetragen: {p}', { p: money(o.price, cur) }), tone: 'ok' }
      case 'changed':
        return { text: o.to < o.from ? t('Preis gesunken auf {p}', { p: money(o.to, cur) }) : t('Preis gestiegen auf {p}', { p: money(o.to, cur) }), tone: 'ok' }
      case 'suggest':
        return { text: t('Neuer Preis gefunden, bitte bestätigen.'), tone: 'warn' }
    }
  }

  const check = async () => {
    if (busy || !hasLink) return
    setBusy(true)
    setMsg(null)
    try {
      const found = await readFound(link.trim())
      const r = applyCheck(item, found, Date.now())
      patch(r.patch)
      if (r.outcome.kind === 'set') onPrice(r.outcome.price, cur)
      if (r.outcome.kind === 'changed') onPrice(r.outcome.to, cur)
      setMsg(describe(r.outcome))
      ui.haptic(r.outcome.kind === 'changed' || r.outcome.kind === 'suggest' ? 18 : 10)
    } catch (e) {
      const x = linkFailExtra(e)
      setMsg({ text: t(linkFailText(e)) + (x.status ? ` (HTTP ${x.status})` : x.why ? ` ${t(x.why)}` : ''), tone: 'warn' })
      ui.haptic(40)
    } finally {
      setBusy(false)
    }
  }

  const accept = () => {
    const s = item.priceSuggest
    if (!s) return
    patch(acceptSuggestion(item, Date.now()))
    onPrice(s.price, cur)
    setMsg({ text: t('Preis übernommen, er gilt jetzt als sicher.'), tone: 'ok' })
  }

  const stateText =
    item.priceState === 'guess'
      ? t('Aus dem Seitentext geraten. Stimmt er, bestätige ihn: Dann gilt er als sicher und neue Preise von dieser Stelle werden automatisch übernommen.')
      : item.priceState === 'sure'
        ? item.priceGuessOk
          ? t('Sicher: Du hast die Stelle auf der Seite bestätigt, neue Preise von dort werden automatisch übernommen.')
          : t('Sicher: von der Seite gelesen oder von dir bestätigt.')
        : item.priceState === 'user'
          ? t('Von dir eingetragen. Neue Preise der Seite kommen nur als Vorschlag.')
          : ''

  return (
    <section className="pw" data-testid="price-watch" data-on={on}>
      <div className="pw__head">
        <div>
          <strong>{t('Preis beobachten')}</strong>
          <p>{on ? t('Die App kann den Preis auf der Seite prüfen und den Verlauf merken.') : t('Aus: Dieser Eintrag wird nie geprüft, es gibt kein Etikett.')}</p>
        </div>
        <Switch checked={on} onChange={(v) => patch({ priceTrack: v ? undefined : false, priceSuggest: v ? item.priceSuggest : undefined })} label={t('Preis beobachten')} />
      </div>

      {on && (
        <>
          {item.price !== undefined && stateText && <p className="pw__state" data-state={item.priceState}>{stateText}</p>}
          {item.price !== undefined && item.priceState === 'guess' && (
            <button type="button" className="btn btn--small btn--ghost" onClick={() => patch(confirmPrice(item, Date.now()))}>
              <Check size={14} /> {t('Der Preis stimmt')}
            </button>
          )}

          <AnimatePresence initial={false}>
            {item.priceSuggest && (
              <motion.div className="pw__sug" data-testid="price-suggest" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <CircleHelp size={18} />
                <div>
                  <strong>{t('Neuer Preis: {p}', { p: money(item.priceSuggest.price, cur) })}</strong>
                  <p>
                    {item.price !== undefined ? t('Bisher {p}.', { p: money(item.price, cur) }) : ''} {item.priceSuggest.guess ? t('Aus dem Seitentext geraten.') : t('Von der Seite gelesen.')} {t('Stimmt das?')}
                  </p>
                  <div className="pw__acts">
                    <button type="button" className="btn btn--small btn--primary" onClick={accept}>
                      {t('Ja, übernehmen')}
                    </button>
                    <button type="button" className="btn btn--small btn--ghost" onClick={() => patch(rejectSuggestion(item))}>
                      <X size={14} /> {t('Nein, ignorieren')}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {delta !== null && (
            <p className="pw__delta" data-dir={delta < 0 ? 'down' : 'up'}>
              {delta < 0 ? <TrendingDown size={15} /> : <TrendingUp size={15} />}
              {delta < 0 ? t('Seit dem Hinzufügen um {p} gesunken', { p: money(-delta, cur) }) : t('Seit dem Hinzufügen um {p} gestiegen', { p: money(delta, cur) })}
            </p>
          )}

          {log.length >= 2 ? <PriceChart points={log} base={item.priceBase} cur={cur} /> : <p className="pw__hint">{t('Der Verlauf entsteht mit jeder Prüfung.')}</p>}

          <div className="pw__foot">
            <button type="button" className="btn btn--small btn--ghost" onClick={() => void check()} disabled={busy || !native || !hasLink} data-testid="price-check">
              {busy ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />} {t('Preis jetzt prüfen')}
            </button>
            <span className="pw__when">
              {!native ? t('Nur in der Android-App') : !hasLink ? t('Ohne Link nicht möglich') : item.priceCheckedAt ? `${t('Zuletzt geprüft')}: ${agoLabel(item.priceCheckedAt, t)}` : t('Noch nie geprüft')}
            </span>
          </div>
          {msg && (
            <p className="pw__msg" data-tone={msg.tone} role="status">
              {msg.text}
            </p>
          )}
        </>
      )}
    </section>
  )
}
